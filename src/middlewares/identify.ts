import jwt from 'jsonwebtoken';
import { User } from '../schemas/user';

export default async function identify(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  if (!decoded) return res.status(403).send('Invalid token');
  const id = JSON.parse(JSON.stringify(decoded)).id;

  const user = await User.findOne({ id });
  if (!user) return res.status(404).send('User not found.');
  req.user = user;

  next();
}
