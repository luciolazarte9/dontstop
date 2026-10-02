export function method(req, res, allowed) {
  if (req.method === allowed) return true;
  res.setHeader('Allow', allowed);
  res.status(405).json({ error: 'Método no permitido.' });
  return false;
}
export function fail(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'No se pudo completar la operación. Intentá de nuevo.' });
}
export function noStore(res) { res.setHeader('Cache-Control', 'private, no-store'); }
