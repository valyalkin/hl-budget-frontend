import { http, HttpResponse, type RequestHandler } from 'msw';
import {
  accountList,
  categoryList,
  categoryTotals,
  merchantList,
  monthlyTotals,
  spendingImport,
  spendingPage,
} from './fixtures';

const API = 'http://api.test/api/v1';

/** Default handlers for the spending screens' reads; tests add their own with server.use(). */
export const handlers: RequestHandler[] = [
  http.get(`${API}/monthly-totals`, ({ request }) => {
    const year = new URL(request.url).searchParams.get('year');
    return HttpResponse.json(monthlyTotals(year ? Number(year) : 2026));
  }),
  http.get(`${API}/spendings`, () => HttpResponse.json(spendingPage())),
  http.get(`${API}/category-totals`, () => HttpResponse.json(categoryTotals)),
  http.get(`${API}/categories`, () => HttpResponse.json(categoryList)),
  http.get(`${API}/accounts`, () => HttpResponse.json(accountList)),
  http.get(`${API}/merchants`, () => HttpResponse.json(merchantList)),
  http.post(`${API}/spending-imports`, () =>
    HttpResponse.json(spendingImport, {
      status: 201,
      headers: { Location: `/api/v1/spending-imports/${spendingImport.id}` },
    }),
  ),
  http.get(`${API}/spending-imports/:id`, () =>
    HttpResponse.json(spendingImport),
  ),
];
