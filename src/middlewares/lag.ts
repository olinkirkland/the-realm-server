export default async function lag(req, res, next) {
  setTimeout(next, 800);
}
