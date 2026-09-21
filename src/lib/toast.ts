export type ToastKind = 'info' | 'success' | 'error';
type Listener = (msg: string, kind: ToastKind) => void;

let listener: Listener | null = null;

export function setToastListener(l: Listener | null) {
  listener = l;
}

export function toast(msg: string, kind: ToastKind = 'info') {
  listener?.(msg, kind);
}