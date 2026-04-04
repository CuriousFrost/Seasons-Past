export function createCache<T>() {
  let uid: string | null = null;
  let data: T | null = null;
  const listeners = new Set<
    (currentUid: string | null, value: T | null) => void
  >();

  function emit() {
    listeners.forEach((listener) => listener(uid, data));
  }

  return {
    get(currentUid: string): T | null {
      return uid === currentUid ? data : null;
    },
    set(currentUid: string, value: T) {
      uid = currentUid;
      data = value;
      emit();
    },
    clear() {
      uid = null;
      data = null;
      emit();
    },
    subscribe(listener: (currentUid: string | null, value: T | null) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
