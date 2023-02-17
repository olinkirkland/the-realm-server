import { uid } from 'uid';
import bcrypt, { hash } from 'bcrypt';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose, { connect } from 'mongoose';
import lag from '../middlewares/lag';
import { User } from '../schemas/user';
import { Color, log } from '../util';
import authenticate from '../middlewares/authenticate';
import identify from '../middlewares/identify';

/**
 * Config
 */

dotenv.config();
const app = express();

log('================= SLOW MODE ON =================', Color.YELLOW);
app.use(lag);

app.use(express.json());
app.use(
  cors({
    origin: '*',
    credentials: true
  })
);

/**
 * Connect to database
 */

log('Connecting to database...');
mongoose.set('strictQuery', false);
connect(process.env.DATABASE_URL)
  .then((res) => {
    log('Connected to database', Color.GREEN);
    startServer();
  })
  .catch((err) => {
    log('Failed to connect to database', Color.RED);
    log(err, Color.RED);
    setTimeout(process.exit, 1000);
  });

/**
 * Routes
 */

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Bad request');
  const user = await User.findOne({ username });
  if (user) return res.status(400).send('User already exists');

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ id: uid(), username, password: hashedPassword });
  await newUser.save();
  log(`User registered: ${username}`, Color.MAGENTA);

  res.status(201).send('User created');
});

let activeRefreshTokens: string[] = [];
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Bad request');
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(403).send('Invalid username or password');

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET
  );

  activeRefreshTokens.push(refreshToken);
  const shortToken = makeShortToken(refreshToken);
  log(`Refresh token added: ${shortToken}`, Color.MAGENTA);

  const accessToken = jwt.sign(
    { id: user.id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '60s' }
  );

  res.send({ id: user.id, accessToken, refreshToken });
});

app.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).send('Bad request');
  if (!activeRefreshTokens.includes(refreshToken))
    return res.status(403).send('Refresh token not found');

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).send('Refresh token invalid');
    const accessToken = jwt.sign(
      { id: user.id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '60s' }
    );
    res.status(200).send({ accessToken });
  });
});

app.delete('/logout', (req, res) => {
  const { refreshToken } = req.body;
  const shortToken = makeShortToken(refreshToken);

  if (!refreshToken) return res.status(400).send('Bad request');
  if (!activeRefreshTokens.includes(refreshToken))
    return res.status(403).send('Refresh token not found');

  activeRefreshTokens = activeRefreshTokens.filter(
    (token) => token !== refreshToken
  );
  log(`Refresh token removed: ${shortToken}`, Color.MAGENTA);
  res.status(204).send('Logged out');
});

app.get('/account', authenticate, identify, (req: any, res) => {
  const user = req.user;
  const accountData = { id: user.id, username: user.username };
  res.status(200).send(accountData);
});

/**
 * Start server
 */

function startServer() {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    log(`Server is listening on port ${port}`, Color.BLUE);
  });
}

/**
 * Helpers
 */

function makeShortToken(token: string) {
  return token.split('.')[2].substring(0, 6);
}
