import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import SalonSwitchSuccess from './SalonSwitchSuccess';

const SalonSwitchSuccessWrapper = () => {
  const { switchSuccess, dismissSwitchSuccess } = useCart();
  const navigate = useNavigate();

  const handleComplete = useCallback(() => {
    if (switchSuccess) {
      navigate(`/salon/${switchSuccess.salonId}`);
    }
    dismissSwitchSuccess();
  }, [switchSuccess, navigate, dismissSwitchSuccess]);

  if (!switchSuccess) return null;

  return (
    <SalonSwitchSuccess
      salonName={switchSuccess.salonName}
      onComplete={handleComplete}
    />
  );
};

export default SalonSwitchSuccessWrapper;
