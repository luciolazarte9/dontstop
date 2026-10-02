import { dispatch } from '../server/router.js';
import { fail } from '../server/_lib/http.js';

export default async function handler(req, res) {
  try { return await dispatch(req, res); }
  catch (error) { return fail(res, error); }
}
