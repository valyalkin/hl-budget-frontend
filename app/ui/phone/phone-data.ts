import type {
  MerchantOption,
  NamedItem,
  Spending,
} from '@/app/lib/definitions';
import type { YearMonth } from '@/app/lib/utils';

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
    items: { id: string; name: string; cents: number }[];
  };
  categories: (NamedItem & { isDefault: boolean })[];
  accounts: NamedItem[];
  merchants: MerchantOption[];
  earliestYear: number | null;
};
