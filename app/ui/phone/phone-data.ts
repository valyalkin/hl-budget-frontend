import type {
  MerchantOption,
  NamedItem,
  Spending,
} from '@/app/lib/definitions';
import type { YearMonth } from '@/app/lib/utils';
import type { BreakdownItem } from '@/app/ui/spendings/breakdown-kind';

/** Everything the phone screens show for one month, as plain serialisable data. */
export type PhoneData = {
  ym: YearMonth;
  today: string;
  currency: string;
  /** The month's total as a decimal string, and how many spendings make it. */
  monthTotal: string;
  count: number;
  spendings: Spending[];
  categoryTotals: {
    totalCents: number;
    items: BreakdownItem[];
  };
  /** Spending per account for the month (specs/008). */
  accountTotals: {
    totalCents: number;
    items: BreakdownItem[];
  };
  categories: (NamedItem & { isDefault: boolean })[];
  accounts: NamedItem[];
  merchants: MerchantOption[];
  earliestYear: number | null;
};
