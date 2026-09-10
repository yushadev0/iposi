import { useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { ApiError, authApi } from '@/lib/api';
import { generateCaptcha } from '@/lib/captcha';
import { useAuth } from '@/store/authStore';
import { iposiAlert, usePopup } from '@/store/popupStore';

function PasswordInput({
  id,
  value,
  onChange,
  onEnter,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className="login-input has-icon"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter()}
      />
      <span className="toggle-eye" onClick={() => setShow((s) => !s)}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </span>
    </>
  );
}

export function LoginScreen() {
  const setUser = useAuth((s) => s.setUser);

  const [flipped, setFlipped] = useState(false);
  const [shakeLogin, setShakeLogin] = useState(false);
  const [shakeReg, setShakeReg] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // login state
  const [lUser, setLUser] = useState('');
  const [lPass, setLPass] = useState('');
  const [remember, setRemember] = useState(false);

  // register state
  const [rUser, setRUser] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPass, setRPass] = useState('');
  const [rPass2, setRPass2] = useState('');
  const [rCaptchaInput, setRCaptchaInput] = useState('');
  const [captcha, setCaptcha] = useState(generateCaptcha);

  const refreshCaptcha = () => setCaptcha(generateCaptcha());

  async function submitLogin() {
    setShakeLogin(true);
    setTimeout(() => setShakeLogin(false), 500);

    if (lUser.trim() === '' || lPass === '') {
      iposiAlert(
        'Missing Information',
        'You must enter a username and password to proceed login.',
        'warning',
      );
      return;
    }
    setBusy(true);
    try {
      const { user } = await authApi.login({ user: lUser, pass: lPass, remember });
      setUser(user);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Kullanıcı adı veya şifre hatalı.';
      iposiAlert('Giriş Başarısız', msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister() {
    setShakeReg(true);
    setTimeout(() => setShakeReg(false), 500);

    if (rPass === '' || rPass2 === '') {
      iposiAlert('Missing Information', 'Please do not leave password fields empty.', 'warning');
      return;
    }
    if (rPass !== rPass2) {
      iposiAlert(
        'Password Missmatch',
        'The passwords you entered do not match. Please check and try again.',
        'error',
      );
      return;
    }
    if (rCaptchaInput.toUpperCase() !== captcha) {
      iposiAlert(
        'Invalid Captcha',
        'You entered the security code incorrectly. Please try again.',
        'error',
      );
      refreshCaptcha();
      setRCaptchaInput('');
      return;
    }

    setBusy(true);
    try {
      await authApi.register({ user: rUser, email: rEmail, pass: rPass });
      iposiAlert(
        'Hoş Geldiniz!',
        'Hesabınız başarıyla oluşturuldu. Giriş yapabilirsiniz.',
        'success',
      );
      setTimeout(() => {
        setFlipped(false);
        usePopup.getState().close();
      }, 2000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Kayıt sırasında bir hata oluştu.';
      iposiAlert('Kayıt Başarısız', msg, 'error');
      refreshCaptcha();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-viewport">
      <div className={`login-card ${flipped ? 'flipped' : ''}`}>
        {/* ---------------- LOGIN FACE ---------------- */}
        <div className={`card-face front ${flipped ? '' : 'active'}`}>
          <h1>
            IPO<span>SI</span>
          </h1>

          <div className="input-group">
            <label>Username</label>
            <input
              className="login-input"
              autoComplete="off"
              value={lUser}
              onChange={(e) => setLUser(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <PasswordInput id="l_pass" value={lPass} onChange={setLPass} onEnter={submitLogin} />
          </div>

          <div className="login-options">
            <label className="switch">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span className="track" />
              Remember me
            </label>
            <a className="forgot-link" onClick={() => setForgotOpen(true)}>
              Forgot password?
            </a>
          </div>

          <button
            className={`login-btn ${shakeLogin ? 'shake' : ''}`}
            disabled={busy}
            onClick={submitLogin}
          >
            LOG IN
          </button>
          <div className="switch-mode">
            Don&apos;t have an account? <a onClick={() => setFlipped(true)}>Sign Up Now</a>
          </div>
        </div>

        {/* ---------------- REGISTER FACE ---------------- */}
        <div className={`card-face back ${flipped ? 'active' : ''}`}>
          <h1>
            SIGN<span> UP</span>
          </h1>

          <div className="input-group">
            <label>Username</label>
            <input
              className="login-input"
              autoComplete="off"
              value={rUser}
              onChange={(e) => setRUser(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitRegister()}
            />
          </div>
          <div className="input-group">
            <label>E-Mail</label>
            <input
              className="login-input"
              autoComplete="off"
              value={rEmail}
              onChange={(e) => setREmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitRegister()}
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <PasswordInput id="r_pass" value={rPass} onChange={setRPass} onEnter={submitRegister} />
          </div>
          <div className="input-group">
            <label>Confirm Password</label>
            <PasswordInput
              id="r_pass2"
              value={rPass2}
              onChange={setRPass2}
              onEnter={submitRegister}
            />
          </div>
          <div className="input-group">
            <label>Security Code</label>
            <div className="captcha-row">
              <input
                className="login-input"
                maxLength={6}
                autoComplete="off"
                value={rCaptchaInput}
                onChange={(e) => setRCaptchaInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitRegister()}
              />
              <div className="captcha-display" title="Click to refresh" onClick={refreshCaptcha}>
                {captcha}
              </div>
            </div>
          </div>

          <button
            className={`login-btn ${shakeReg ? 'shake' : ''}`}
            disabled={busy}
            onClick={submitRegister}
          >
            CREATE MY ACCOUNT
          </button>
          <div className="switch-mode">
            Already a member? <a onClick={() => setFlipped(false)}>Log In</a>
          </div>
        </div>
      </div>

      {forgotOpen && (
        <div className="modal-overlay" onMouseDown={() => setForgotOpen(false)}>
          <div className="modal-box" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>PASSWORD RESET</h2>
              <span className="x" onClick={() => setForgotOpen(false)}>
                <X size={20} />
              </span>
            </div>
            <div className="modal-body">
              <p>Enter your registered e-mail address.</p>
              <input className="modal-input" placeholder="Your E-Mail Address" />
              <button className="modal-btn" onClick={() => setForgotOpen(false)}>
                SEND RESET LINK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
