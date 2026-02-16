export function createCache<T>() {
  let uid: string | null = null;
  let data: T | null = null;
  return {
    get(currentUid: string): T | null {
      return uid === currentUid ? data : null;
    },
    set(currentUid: string, value: T) {
      uid = currentUid;
      data = value;
    },
    clear() {
      uid = null;
      data = null;
    },
  };
}
