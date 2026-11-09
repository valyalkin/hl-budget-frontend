'use client';

import type { OverviewData } from '@/app/lib/overview';
import { monthLabel } from '@/app/lib/utils';
import BreakdownYearCard from '@/app/ui/overview/breakdown-year-card';
import MonthsCard from '@/app/ui/overview/months-card';
import TotalTiles from '@/app/ui/overview/total-tiles';
import YearPicker from '@/app/ui/overview/year-picker';

/** "January to December 2025", or "January to October 2026 (year to date)" (FR-007). */
function periodLine({
  year,
  currentYear,
  monthsElapsed,
}: OverviewData): string {
  if (year < currentYear) {
    return `January to December ${year}`;
  }
  return `January to ${monthLabel({ year, month: monthsElapsed })} (year to date)`;
}

/** The Overview's content (specs/011): one responsive tree for desktop and phone (R-008). */
export default function OverviewView({ data }: { data: OverviewData }) {
  return (
    <main
      data-year={data.year}
      className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 pt-6 pb-16 sm:px-6 sm:pt-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] leading-[1.05] font-bold tracking-tight sm:text-4xl">
            Overview
          </h1>
          <p className="mt-1.5 text-muted">{periodLine(data)}</p>
        </div>
        <YearPicker
          year={data.year}
          minYear={data.minYear}
          currentYear={data.currentYear}
          month={data.month}
        />
      </div>
      <TotalTiles data={data} />
      <MonthsCard data={data} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] items-start gap-6">
        <BreakdownYearCard kind="category" data={data} />
        <BreakdownYearCard kind="account" data={data} />
      </div>
    </main>
  );
}
