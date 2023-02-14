import { model, Schema } from 'mongoose';

export interface IUser {
  id: string;
  username: string;
  password: string;
}

export const userSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

export const User = model<IUser>('User', userSchema);
