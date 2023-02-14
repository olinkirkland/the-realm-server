export enum Color {
  RED = '\x1b[31m',
  GREEN = '\x1b[32m',
  YELLOW = '\x1b[33m',
  BLUE = '\x1b[34m',
  MAGENTA = '\x1b[35m',
  CYAN = '\x1b[36m',
  WHITE = '\x1b[37m'
}

export function log(value: any, color: Color = Color.WHITE) {
  console.log(color, value.toString(), '\x1b[0m');
}
