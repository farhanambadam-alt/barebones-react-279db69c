import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { findServiceById } from '@/services/hooks/useServices';
import type { Salon } from '@/types/salon';

interface CartItem {
  serviceId: string;
  quantity: number;
}

interface CartContextType {
  salon: Salon | null;
  items: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (serviceId: string, salon: Salon) => void;
  removeFromCart: (serviceId: string) => void;
  clearCart: () => void;
  /** Returns true if added, false if switch modal should show */
  tryAddToCart: (serviceId: string, salon: Salon) => boolean;
  /** Pending add info when switch modal is open */
  pendingAdd: { serviceId: string; salon: Salon } | null;
  confirmSwitch: () => void;
  cancelSwitch: () => void;
  showSwitchModal: boolean;
  /** Success overlay state after confirming switch */
  switchSuccess: { salonName: string; salonId: string } | null;
  dismissSwitchSuccess: () => void;
}

const CartContext = createContext<CartContextType>({
  salon: null,
  items: [],
  cartCount: 0,
  cartTotal: 0,
  addToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  tryAddToCart: () => true,
  pendingAdd: null,
  confirmSwitch: () => {},
  cancelSwitch: () => {},
  showSwitchModal: false,
  switchSuccess: null,
  dismissSwitchSuccess: () => {},
});

export const useCart = () => useContext(CartContext);

const STORAGE_KEY = 'customer_cart';

interface PersistedCart {
  salon: Salon | null;
  items: CartItem[];
}

const readPersisted = (): PersistedCart => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { salon: null, items: [] };
    const parsed = JSON.parse(raw) as PersistedCart;
    if (!parsed || !Array.isArray(parsed.items)) return { salon: null, items: [] };
    return parsed;
  } catch {
    return { salon: null, items: [] };
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const initial = useRef<PersistedCart>(readPersisted());
  const [salon, setSalon] = useState<Salon | null>(initial.current.salon);
  const [items, setItems] = useState<CartItem[]>(initial.current.items);
  const [pendingAdd, setPendingAdd] = useState<{ serviceId: string; salon: Salon } | null>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchSuccess, setSwitchSuccess] = useState<{ salonName: string; salonId: string } | null>(null);

  // Persist cart on every change. Transient UI (pendingAdd / modal / success) excluded.
  useEffect(() => {
    try {
      if (!salon || items.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ salon, items }));
      }
    } catch {
      /* ignore quota / privacy mode */
    }
  }, [salon, items]);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = items.reduce((total, item) => {
    const svc = findServiceById(item.serviceId);
    return total + (svc?.price || 0) * item.quantity;
  }, 0);

  const addToCart = useCallback((serviceId: string, newSalon: Salon) => {
    setSalon(newSalon);
    setItems((prev) => {
      const existing = prev.find((i) => i.serviceId === serviceId);
      if (existing) {
        return prev.map((i) =>
          i.serviceId === serviceId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { serviceId, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((serviceId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.serviceId === serviceId);
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return prev.map((i) =>
          i.serviceId === serviceId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      const next = prev.filter((i) => i.serviceId !== serviceId);
      if (next.length === 0) setSalon(null);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setSalon(null);
    setPendingAdd(null);
    setShowSwitchModal(false);
  }, []);

  const tryAddToCart = useCallback(
    (serviceId: string, newSalon: Salon): boolean => {
      if (!salon || salon.id === newSalon.id) {
        addToCart(serviceId, newSalon);
        return true;
      }
      // Different salon — show switch modal
      setPendingAdd({ serviceId, salon: newSalon });
      setShowSwitchModal(true);
      return false;
    },
    [salon, addToCart]
  );

  const confirmSwitch = useCallback(() => {
    if (pendingAdd) {
      const newSalonName = pendingAdd.salon.name;
      const newSalonId = pendingAdd.salon.id;
      setItems([{ serviceId: pendingAdd.serviceId, quantity: 1 }]);
      setSalon(pendingAdd.salon);
      setSwitchSuccess({ salonName: newSalonName, salonId: newSalonId });
    }
    setPendingAdd(null);
    setShowSwitchModal(false);
  }, [pendingAdd]);

  const cancelSwitch = useCallback(() => {
    setPendingAdd(null);
    setShowSwitchModal(false);
  }, []);

  const dismissSwitchSuccess = useCallback(() => {
    setSwitchSuccess(null);
  }, []);

  return (
    <CartContext.Provider
      value={{
        salon,
        items,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        clearCart,
        tryAddToCart,
        pendingAdd,
        confirmSwitch,
        cancelSwitch,
        showSwitchModal,
        switchSuccess,
        dismissSwitchSuccess,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
