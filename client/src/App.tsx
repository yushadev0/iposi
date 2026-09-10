import { useEffect } from 'react';
import { IposiPopup } from '@/components/IposiPopup';
import { LoginScreen } from '@/components/login/LoginScreen';
import { Workspace } from '@/components/workspace/Workspace';
import { useAuth } from '@/store/authStore';

export default function App() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const init = useAuth((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <>
      {status === 'loading' ? (
        <div className="boot">
          IPO<span>SI</span>
        </div>
      ) : user ? (
        <Workspace />
      ) : (
        <LoginScreen />
      )}
      <IposiPopup />
    </>
  );
}
