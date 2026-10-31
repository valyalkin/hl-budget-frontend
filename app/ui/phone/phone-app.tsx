'use client';

import { Fragment, useEffect } from 'react';
import type { Draft } from '@/app/lib/draft';
import { defaultDateFor, monthLabel } from '@/app/lib/utils';
import AccountMenu from '@/app/ui/phone/account-menu';
import CategoryBreakdown from '@/app/ui/phone/category-breakdown';
import DeleteSheet from '@/app/ui/phone/delete-sheet';
import MonthYearPicker from '@/app/ui/phone/month-year-picker';
import type { PhoneData } from '@/app/ui/phone/phone-data';
import PhoneHeader from '@/app/ui/phone/phone-header';
import PhoneImport from '@/app/ui/phone/phone-import';
import PhoneReview from '@/app/ui/phone/phone-review';
import PhoneSettings from '@/app/ui/phone/phone-settings';
import { type Layer, usePhoneUi } from '@/app/ui/phone/phone-ui-provider';
import SpendingForm from '@/app/ui/phone/spending-form';
import SpendingList from '@/app/ui/phone/spending-list';

/** The phone layout's root (plan.md): the Spendings screen and every layer over it. */
export default function PhoneApp({ data }: { data: PhoneData }) {
  const ui = usePhoneUi();
  const label = monthLabel(data.ym);
  const { reset } = ui;

  // Leaving the phone layout (the width grew past 640px) closes every layer (Edge Cases).
  useEffect(() => () => reset(), [reset]);

  const lookups = {
    today: data.today,
    currency: data.currency,
    categories: data.categories,
    accounts: data.accounts,
    merchants: data.merchants,
  };
  const spendingOf = (layer: Layer | undefined) =>
    layer?.kind === 'edit' && layer.spendingId
      ? data.spendings.find((s) => s.id === layer.spendingId)
      : undefined;

  const renderLayer = (layer: Layer, index: number) => {
    switch (layer.kind) {
      case 'menu':
        return <AccountMenu />;
      case 'edit': {
        if (!layer.spendingId) {
          const blank: Draft = {
            date: defaultDateFor(data.ym, data.today),
            merchant: '',
            category: '',
            account: '',
            amount: '',
          };
          return <SpendingForm mode="add" initial={blank} {...lookups} />;
        }
        const spending = spendingOf(layer);
        if (!spending) {
          return null;
        }
        return (
          <SpendingForm
            mode="edit"
            spendingId={spending.id}
            initial={{
              date: spending.date,
              merchant: spending.merchant,
              category: spending.category.name,
              account: spending.account.name,
              amount: spending.amount.amount,
            }}
            onRemove={() => ui.open({ kind: 'confirm-delete' })}
            {...lookups}
          />
        );
      }
      case 'confirm-delete': {
        const spending = spendingOf(ui.layers[index - 1]);
        return spending ? <DeleteSheet spending={spending} /> : null;
      }
      case 'settings':
        return (
          <PhoneSettings
            categories={data.categories}
            accounts={data.accounts}
          />
        );
      case 'import':
        return (
          <PhoneImport
            lookups={{ categories: data.categories, accounts: data.accounts }}
          />
        );
      case 'review':
        return ui.importSession ? (
          <PhoneReview
            session={ui.importSession}
            today={data.today}
            currency={data.currency}
          />
        ) : null;
      case 'fix-row': {
        const session = ui.importSession;
        const row = session?.rows.find((r) => r.key === layer.key);
        if (!session || !row) {
          return null;
        }
        return (
          <SpendingForm
            mode="fix-row"
            initial={row.draft}
            onFixSave={(draft) => {
              ui.setImportSession({
                ...session,
                rows: session.rows.map((r) =>
                  r.key === row.key ? { ...r, draft } : r,
                ),
              });
              ui.close();
            }}
            onRemove={() => {
              ui.setImportSession({
                ...session,
                rows: session.rows.filter((r) => r.key !== row.key),
              });
              ui.close();
            }}
            {...lookups}
          />
        );
      }
    }
  };

  return (
    <div data-layout="phone" className="min-h-dvh bg-ground">
      <PhoneHeader />
      <main>
        <h1 className="sr-only">{label}</h1>
        <MonthYearPicker
          ym={data.ym}
          today={data.today}
          earliestYear={data.earliestYear}
          monthTotal={data.monthTotal}
          currency={data.currency}
          count={data.count}
        />
        {ui.notice ? (
          <p
            role="status"
            className="mx-4 mt-4 rounded-xl bg-brand-tint px-4 py-3 text-sm font-medium text-brand-strong"
          >
            {ui.notice}
          </p>
        ) : null}
        {ui.view === 'spendings' ? (
          <SpendingList spendings={data.spendings} label={label} />
        ) : (
          <CategoryBreakdown
            label={label}
            currency={data.currency}
            totalCents={data.categoryTotals.totalCents}
            items={data.categoryTotals.items}
          />
        )}
      </main>
      {ui.layers.map((layer, index) => (
        <Fragment key={`${index}-${layer.kind}`}>
          {renderLayer(layer, index)}
        </Fragment>
      ))}
    </div>
  );
}
