import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail: string | null;
  onConfirm: (email: string, saveAsDefault: boolean) => void;
  isSending?: boolean;
  isSuccess?: boolean;
}

export const EmailModal: React.FC<EmailModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultEmail, 
  onConfirm,
  isSending = false,
  isSuccess = false
}) => {
  const [mode, setMode] = useState<'select' | 'input'>(defaultEmail ? 'select' : 'input');
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(defaultEmail ? 'select' : 'input');
      setEmailInput('');
      setError('');
    }
  }, [isOpen, defaultEmail]);

  if (!isOpen) return null;

  const validateAndConfirm = (email: string, save: boolean) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    onConfirm(email, save);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8">
          {isSuccess ? (
            <div className="text-center py-8 animate-in zoom-in">
              <div className="w-16 h-16 bg-[#d8f3dc] text-[#1b4332] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Email Sent!</h3>
              <p className="text-slate-500 mt-2">Your outline has been sent to the cloud.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                  {mode === 'input' && !defaultEmail ? 'Save Recipient' : 'Destination'}
                </h3>
                <button onClick={onClose} disabled={isSending} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {mode === 'select' && defaultEmail ? (
                <div className="space-y-4">
                  <p className="text-slate-600">Send to your saved address?</p>
                  <Button
                    onClick={() => onConfirm(defaultEmail, false)}
                    isLoading={isSending}
                    className="w-full justify-start py-4 bg-[#d8f3dc]/50 text-[#1b4332] hover:bg-[#d8f3dc] shadow-none border border-[#d8f3dc]"
                  >
                    <div className="text-left">
                      <div className="text-xs uppercase font-bold opacity-60 tracking-wider">Recipient</div>
                      <div className="font-semibold">{defaultEmail}</div>
                    </div>
                  </Button>
                  <button
                    onClick={() => setMode('input')}
                    disabled={isSending}
                    className="w-full text-slate-400 text-sm font-medium hover:text-[#52b788] transition-colors"
                  >
                    Change email address
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="email"
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 bg-[#fbfaf5] border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#52b788] text-slate-900 font-medium"
                    value={emailInput}
                    disabled={isSending}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setError('');
                    }}
                  />
                  {error && <p className="text-rose-500 text-xs">{error}</p>}
                  <Button 
                    onClick={() => validateAndConfirm(emailInput, !defaultEmail)} 
                    isLoading={isSending}
                    className="w-full"
                  >
                    Confirm & Send
                  </Button>
                  {defaultEmail && (
                    <button onClick={() => setMode('select')} className="w-full text-slate-400 text-sm">Cancel</button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};