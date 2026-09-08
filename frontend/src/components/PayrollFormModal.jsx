import { useState } from 'react';
import Modal from './Modal';
import { fieldWrap, labelStyle, inputStyle, primaryBtn, secondaryBtn, errorBanner } from './formStyles';
import { exactMoney } from '../utils/currency';

export default function PayrollFormModal({ record, onClose, onSaved, onSubmit }) {
  const [form, setForm] = useState({
    baseSalary: record.baseSalary ?? 0,
    allowances: record.allowances ?? 0,
    bonus: record.bonus ?? 0,
    deductions: record.deductions ?? 0,
    status: record.status || 'pending',
    notes: record.notes || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const netPay = Math.max(
    0,
    (Number(form.baseSalary) || 0) + (Number(form.allowances) || 0) + (Number(form.bonus) || 0) - (Number(form.deductions) || 0)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit(
        {
          baseSalary: Number(form.baseSalary) || 0,
          allowances: Number(form.allowances) || 0,
          bonus: Number(form.bonus) || 0,
          deductions: Number(form.deductions) || 0,
          status: form.status,
          notes: form.notes,
        },
        record._id
      );
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while saving this payslip.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Payslip — ${record.employee?.name} · ${record.month}`} onClose={onClose} width={460}>
      <style>{`
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 480px) { .form-grid-2 { grid-template-columns: 1fr; } }
      `}</style>
      <form onSubmit={handleSubmit}>
        {error && <div style={errorBanner}>{error}</div>}

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Base salary ($)</label>
            <input type="number" min="0" step="0.01" style={inputStyle} value={form.baseSalary} onChange={update('baseSalary')} />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Allowances ($)</label>
            <input type="number" min="0" step="0.01" style={inputStyle} value={form.allowances} onChange={update('allowances')} />
          </div>
        </div>

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Bonus ($)</label>
            <input type="number" min="0" step="0.01" style={inputStyle} value={form.bonus} onChange={update('bonus')} />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Deductions ($)</label>
            <input type="number" min="0" step="0.01" style={inputStyle} value={form.deductions} onChange={update('deductions')} />
          </div>
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status} onChange={update('status')}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Notes</label>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
            value={form.notes}
            onChange={update('notes')}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, fontWeight: 700, borderTop: '1px solid var(--border-hairline-soft)', paddingTop: 12, marginBottom: 16 }}>
          <span>Net pay</span>
          <span className="mono">{exactMoney(netPay)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" style={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="submit" style={primaryBtn} disabled={saving}>{saving ? 'Saving…' : 'Save payslip'}</button>
        </div>
      </form>
    </Modal>
  );
}
