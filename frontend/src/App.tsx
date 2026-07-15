import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  Coins, 
  RotateCcw, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Terminal as TerminalIcon,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  Users
} from 'lucide-react';

// Interfaces matching backend DB / Shared schemas
interface User {
  id: string;
  email: string;
  airtmAccount: string;
  availableBalance: number;
  reservedBalance: number;
}

interface Escrow {
  id: string;
  clientId: string;
  providerId: string;
  amount: number;
  status: 'PENDING' | 'RELEASED' | 'REFUNDED';
  stellarEscrowId: string | null;
}

interface Transaction {
  id: string;
  userId: string;
  type: 'TOPUP' | 'WITHDRAWAL' | 'ESCROW_LOCK' | 'ESCROW_RELEASE' | 'ESCROW_REFUND';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  reference: string | null;
  createdAt: string;
}

interface LogLine {
  text: string;
  type: 'info' | 'success' | 'warn' | 'error';
  timestamp: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'escrows' | 'payouts' | 'logs'>('dashboard');

  // Simulated Database State
  const [users, setUsers] = useState<User[]>([
    {
      id: 'usr_client',
      email: 'client@example.com',
      airtmAccount: 'client_airtm_123',
      availableBalance: 1000.00,
      reservedBalance: 0.00,
    },
    {
      id: 'usr_freelancer',
      email: 'freelancer@example.com',
      airtmAccount: 'freelancer_airtm_456',
      availableBalance: 150.00,
      reservedBalance: 0.00,
    }
  ]);

  const [escrows, setEscrows] = useState<Escrow[]>([
    {
      id: 'esc_001',
      clientId: 'usr_client',
      providerId: 'usr_freelancer',
      amount: 300.00,
      status: 'PENDING',
      stellarEscrowId: 'stellar_escrow_59384'
    }
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'tx_001',
      userId: 'usr_client',
      type: 'TOPUP',
      amount: 1000.00,
      status: 'SUCCESS',
      reference: 'airtm_deposit_9583',
      createdAt: new Date(Date.now() - 3600000).toLocaleTimeString()
    },
    {
      id: 'tx_002',
      userId: 'usr_freelancer',
      type: 'TOPUP',
      amount: 150.00,
      status: 'SUCCESS',
      reference: 'airtm_deposit_1092',
      createdAt: new Date(Date.now() - 1800000).toLocaleTimeString()
    }
  ]);

  // Terminal & UI Logs
  const [logs, setLogs] = useState<LogLine[]>([
    { text: 'System initialized. Connected to PostgreSQL.', type: 'success', timestamp: new Date().toLocaleTimeString() },
    { text: 'VeloHub Background Queue Worker active and polling Redis...', type: 'info', timestamp: new Date().toLocaleTimeString() },
    { text: 'Seeding complete. Created clients and freelancers.', type: 'info', timestamp: new Date().toLocaleTimeString() }
  ]);

  // Inputs
  const [topUpAmount, setTopUpAmount] = useState('200.00');
  const [withdrawAmount, setWithdrawAmount] = useState('100.00');
  const [lockAmount, setLockAmount] = useState('250.00');
  const [withdrawTargetUser, setWithdrawTargetUser] = useState('usr_client');

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const addLog = (text: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setLogs(prev => [
      { text, type, timestamp: new Date().toLocaleTimeString() },
      ...prev
    ]);
  };

  const showNotification = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Simulating Airtm Deposits (TopUp)
  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(topUpAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    setIsSimulating(true);
    const mockTxId = `tx_top_${Math.floor(Math.random() * 1000)}`;

    addLog(`[API] POST /payments/topup | Idempotency-Key validated. Enqueuing process-topup job...`, 'info');
    
    // Add pending transaction
    const newTx: Transaction = {
      id: mockTxId,
      userId: 'usr_client',
      type: 'TOPUP',
      amount: amountVal,
      status: 'PENDING',
      reference: null,
      createdAt: new Date().toLocaleTimeString()
    };
    setTransactions(prev => [newTx, ...prev]);

    // Simulate Worker picking up job from Redis
    setTimeout(() => {
      addLog(`[Worker] Dequeued 'process-topup' (Tx ID: ${mockTxId}). Confirming Airtm transaction...`, 'info');
      
      setTimeout(() => {
        // DB balance update
        setUsers(prev => prev.map(u => u.id === 'usr_client' ? {
          ...u,
          availableBalance: u.availableBalance + amountVal
        } : u));

        // Update transaction status
        setTransactions(prev => prev.map(t => t.id === mockTxId ? {
          ...t,
          status: 'SUCCESS',
          reference: `airtm_deposit_${Math.floor(Math.random() * 10000)}`
        } : t));

        addLog(`[Worker] User client@example.com balance credited. Status: SUCCESS`, 'success');
        showNotification(`Deposited ${amountVal} USDC successfully!`, 'success');
        setIsSimulating(false);
      }, 1500);

    }, 800);
  };

  // 2. Simulating Airtm Withdrawals
  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(withdrawAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    const user = users.find(u => u.id === withdrawTargetUser);
    if (!user || user.availableBalance < amountVal) {
      addLog(`[API] POST /payments/withdraw | Failed: Insufficient available balance.`, 'error');
      showNotification('Insufficient available balance!', 'error');
      return;
    }

    setIsSimulating(true);
    const mockTxId = `tx_with_${Math.floor(Math.random() * 1000)}`;

    addLog(`[API] POST /payments/withdraw | Transaction lock started. Deducting available balance...`, 'info');
    
    // Deduct available immediately (Postgres database transaction lock emulation)
    setUsers(prev => prev.map(u => u.id === withdrawTargetUser ? {
      ...u,
      availableBalance: u.availableBalance - amountVal
    } : u));

    const newTx: Transaction = {
      id: mockTxId,
      userId: withdrawTargetUser,
      type: 'WITHDRAWAL',
      amount: amountVal,
      status: 'PENDING',
      reference: null,
      createdAt: new Date().toLocaleTimeString()
    };
    setTransactions(prev => [newTx, ...prev]);

    setTimeout(() => {
      addLog(`[Worker] Processing 'process-withdrawal' (Tx ID: ${mockTxId}) for ${user.email}...`, 'info');

      setTimeout(() => {
        setTransactions(prev => prev.map(t => t.id === mockTxId ? {
          ...t,
          status: 'SUCCESS',
          reference: `airtm_payout_${Math.floor(Math.random() * 10000)}`
        } : t));

        addLog(`[Worker] Payout successfully routed to Airtm. Status: SUCCESS`, 'success');
        showNotification(`Withdrew ${amountVal} USDC successfully!`, 'success');
        setIsSimulating(false);
      }, 1500);

    }, 800);
  };

  // 3. Simulating Locking available funds into Stellar Non-Custodial Escrow
  const handleLockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(lockAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    const client = users.find(u => u.id === 'usr_client');
    if (!client || client.availableBalance < amountVal) {
      addLog(`[API] POST /escrows/lock | Failed: Client has insufficient available balance.`, 'error');
      showNotification('Client has insufficient available balance!', 'error');
      return;
    }

    setIsSimulating(true);
    const mockEscrowId = `esc_${Math.floor(Math.random() * 1000)}`;
    const mockTxId = `tx_lock_${Math.floor(Math.random() * 1000)}`;

    addLog(`[API] POST /escrows/lock | Client Available -${amountVal}, Client Reserved +${amountVal}`, 'info');

    // DB balance update
    setUsers(prev => prev.map(u => u.id === 'usr_client' ? {
      ...u,
      availableBalance: u.availableBalance - amountVal,
      reservedBalance: u.reservedBalance + amountVal
    } : u));

    // Create escrow PENDING
    const newEscrow: Escrow = {
      id: mockEscrowId,
      clientId: 'usr_client',
      providerId: 'usr_freelancer',
      amount: amountVal,
      status: 'PENDING',
      stellarEscrowId: null
    };
    setEscrows(prev => [newEscrow, ...prev]);

    // Create tx
    const newTx: Transaction = {
      id: mockTxId,
      userId: 'usr_client',
      type: 'ESCROW_LOCK',
      amount: amountVal,
      status: 'PENDING',
      reference: mockEscrowId,
      createdAt: new Date().toLocaleTimeString()
    };
    setTransactions(prev => [newTx, ...prev]);

    setTimeout(() => {
      addLog(`[Worker] Submitting on-chain Stellar transaction via Trustless Work SDK...`, 'info');

      setTimeout(() => {
        const mockStellarId = `stellar_escrow_${Math.floor(Math.random() * 100000)}`;
        
        setEscrows(prev => prev.map(e => e.id === mockEscrowId ? {
          ...e,
          stellarEscrowId: mockStellarId
        } : e));

        setTransactions(prev => prev.map(t => t.id === mockTxId ? {
          ...t,
          status: 'SUCCESS',
          reference: `0xstellarhash_${Math.floor(Math.random() * 100000)}`
        } : t));

        addLog(`[Worker] Stellar on-chain escrow created. Escrow ID: ${mockStellarId}`, 'success');
        showNotification(`Locked ${amountVal} USDC into non-custodial escrow!`, 'success');
        setIsSimulating(false);
      }, 1500);

    }, 800);
  };

  // 4. Release Escrow
  const handleRelease = (escrowId: string) => {
    const escrow = escrows.find(e => e.id === escrowId);
    if (!escrow || escrow.status !== 'PENDING') return;

    setIsSimulating(true);
    addLog(`[API] POST /escrows/release | Escrow: ${escrowId}. Shifting balances: Client Reserved -> Provider Available`, 'info');

    setUsers(prev => prev.map(u => {
      if (u.id === escrow.clientId) {
        return { ...u, reservedBalance: u.reservedBalance - escrow.amount };
      }
      if (u.id === escrow.providerId) {
        return { ...u, availableBalance: u.availableBalance + escrow.amount };
      }
      return u;
    }));

    setEscrows(prev => prev.map(e => e.id === escrowId ? { ...e, status: 'RELEASED' } : e));

    const mockTxId = `tx_rel_${Math.floor(Math.random() * 1000)}`;
    const newTx: Transaction = {
      id: mockTxId,
      userId: escrow.providerId,
      type: 'ESCROW_RELEASE',
      amount: escrow.amount,
      status: 'SUCCESS',
      reference: escrowId,
      createdAt: new Date().toLocaleTimeString()
    };
    setTransactions(prev => [newTx, ...prev]);

    setTimeout(() => {
      addLog(`[Worker] Enqueued Stellar on-chain release transaction...`, 'info');
      setTimeout(() => {
        addLog(`[Worker] Stellar contract release confirmed. Hash: 0xstellarhash_${Math.floor(Math.random() * 10000)}`, 'success');
        showNotification('Escrow released successfully to Freelancer!', 'success');
        setIsSimulating(false);
      }, 1500);
    }, 800);
  };

  // 5. Refund Escrow
  const handleRefund = (escrowId: string) => {
    const escrow = escrows.find(e => e.id === escrowId);
    if (!escrow || escrow.status !== 'PENDING') return;

    setIsSimulating(true);
    addLog(`[API] POST /escrows/refund | Escrow: ${escrowId}. Refunding balances: Client Reserved -> Client Available`, 'info');

    setUsers(prev => prev.map(u => {
      if (u.id === escrow.clientId) {
        return {
          ...u,
          reservedBalance: u.reservedBalance - escrow.amount,
          availableBalance: u.availableBalance + escrow.amount
        };
      }
      return u;
    }));

    setEscrows(prev => prev.map(e => e.id === escrowId ? { ...e, status: 'REFUNDED' } : e));

    const mockTxId = `tx_ref_${Math.floor(Math.random() * 1000)}`;
    const newTx: Transaction = {
      id: mockTxId,
      userId: escrow.clientId,
      type: 'ESCROW_REFUND',
      amount: escrow.amount,
      status: 'SUCCESS',
      reference: escrowId,
      createdAt: new Date().toLocaleTimeString()
    };
    setTransactions(prev => [newTx, ...prev]);

    setTimeout(() => {
      addLog(`[Worker] Enqueued Stellar on-chain refund transaction...`, 'info');
      setTimeout(() => {
        addLog(`[Worker] Stellar contract refund confirmed. Hash: 0xstellarhash_${Math.floor(Math.random() * 10000)}`, 'success');
        showNotification('Escrow refunded successfully to Client!', 'success');
        setIsSimulating(false);
      }, 1500);
    }, 800);
  };

  return (
    <div className="app-container">
      {/* Top Banner Notifications */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 100,
          background: notification.type === 'success' ? 'var(--success)' : 'var(--error)',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'white',
          fontWeight: '600',
          transition: 'all 0.3s ease'
        }}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {notification.text}
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="logo-container">
          <div className="logo-icon">V</div>
          <span className="logo-text">VeloHub</span>
        </div>
        <div className="status-badge">
          <div className="pulsing-dot"></div>
          Orchestrator Active (Stellar Testnet)
        </div>
      </header>

      <div className="main-wrapper">
        {/* Sidebar */}
        <aside className="sidebar">
          <button 
            className={`sidebar-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            Balances Ledger
          </button>
          <button 
            className={`sidebar-btn ${activeTab === 'escrows' ? 'active' : ''}`}
            onClick={() => setActiveTab('escrows')}
          >
            <Shield size={18} />
            Escrow Board
          </button>
          <button 
            className={`sidebar-btn ${activeTab === 'payouts' ? 'active' : ''}`}
            onClick={() => setActiveTab('payouts')}
          >
            <ArrowRightLeft size={18} />
            Airtm Portal
          </button>
          <button 
            className={`sidebar-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <Activity size={18} />
            Transaction Audit
          </button>
        </aside>

        {/* Content Area */}
        <main className="content-area">
          
          {/* 1. BALANCES LEDGER */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="section-title">
                <Users size={22} style={{ color: 'var(--accent-purple)' }} />
                Double-Balance Ledger Pools
              </div>
              <div className="dashboard-grid">
                {users.map(u => (
                  <div className="stat-card" key={u.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="stat-header">
                      <span>{u.email}</span>
                      <span className="badge badge-success">{u.id === 'usr_client' ? 'Client' : 'Freelancer'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Balance</div>
                        <div className="stat-value" style={{ color: '#60a5fa' }}>{u.availableBalance.toFixed(2)} USDC</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reserved (Escrow)</div>
                        <div className="stat-value" style={{ color: '#a78bfa' }}>{u.reservedBalance.toFixed(2)} USDC</div>
                      </div>
                    </div>
                    <div className="stat-desc">Airtm Link: {u.airtmAccount}</div>
                  </div>
                ))}
                
                {/* Stats Summary */}
                <div className="stat-card">
                  <div className="stat-header">
                    <span>Monorepo Metrics</span>
                    <Coins size={16} />
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Escrows Value</div>
                    <div className="stat-value" style={{ color: 'var(--success)' }}>
                      {escrows.filter(e => e.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)} USDC
                    </div>
                  </div>
                  <div className="stat-desc">Total audited transactions: {transactions.length}</div>
                </div>
              </div>

              {/* Logger widget */}
              <div className="glass-panel" style={{ marginTop: '2rem' }}>
                <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                  <TerminalIcon size={16} />
                  Orchestration Log Stream
                </h3>
                <div className="terminal-panel">
                  {logs.map((l, index) => (
                    <p className={`terminal-line ${l.type}`} key={index}>
                      [{l.timestamp}] {l.text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. ESCROW BOARD */}
          {activeTab === 'escrows' && (
            <div>
              <div className="glass-panel">
                <h2 className="section-title">
                  <Shield size={22} style={{ color: 'var(--accent-cyan)' }} />
                  Lock Available Balance in Stellar Escrow (Trustless Work)
                </h2>
                <form onSubmit={handleLockSubmit} className="form-grid">
                  <div className="form-group">
                    <label>Funding Client</label>
                    <input type="text" className="form-input" value="client@example.com" disabled />
                  </div>
                  <div className="form-group">
                    <label>Provider Target (Freelancer)</label>
                    <input type="text" className="form-input" value="freelancer@example.com" disabled />
                  </div>
                  <div className="form-group">
                    <label>Lock Amount (USDC)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={lockAmount} 
                      onChange={e => setLockAmount(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ justifyContent: 'flex-end', display: 'flex' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'auto' }} disabled={isSimulating}>
                      Lock On-Chain Escrow
                    </button>
                  </div>
                </form>
              </div>

              <div className="glass-panel">
                <h2 className="section-title">Active Escrow Registry</h2>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Client</th>
                        <th>Provider</th>
                        <th>Escrow Amount</th>
                        <th>On-Chain Status</th>
                        <th>Stellar Escrow ID</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {escrows.map(e => (
                        <tr key={e.id}>
                          <td>{e.id}</td>
                          <td>client@example.com</td>
                          <td>freelancer@example.com</td>
                          <td style={{ fontWeight: '600' }}>{e.amount.toFixed(2)} USDC</td>
                          <td>
                            <span className={`badge ${e.status === 'PENDING' ? 'badge-pending' : e.status === 'RELEASED' ? 'badge-success' : 'badge-error'}`}>
                              {e.status}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{e.stellarEscrowId || 'Deploying...'}</td>
                          <td>
                            {e.status === 'PENDING' && (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => handleRelease(e.id)} className="btn btn-success" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} disabled={isSimulating}>
                                  Release
                                </button>
                                <button onClick={() => handleRefund(e.id)} className="btn btn-error" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} disabled={isSimulating}>
                                  Refund
                                </button>
                              </div>
                            )}
                            {e.status !== 'PENDING' && <span style={{ color: 'var(--text-muted)' }}>Lifecycle complete</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. AIRTM PORTAL */}
          {activeTab === 'payouts' && (
            <div className="form-grid">
              <div className="glass-panel">
                <h2 className="section-title">
                  <ArrowUpRight size={22} style={{ color: 'var(--success)' }} />
                  Airtm Top-Up (Deposit)
                </h2>
                <form onSubmit={handleTopUpSubmit}>
                  <div className="form-group">
                    <label>Target Account</label>
                    <input type="text" className="form-input" value="client@example.com" disabled />
                  </div>
                  <div className="form-group">
                    <label>Deposit Amount (USDC)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={topUpAmount} 
                      onChange={e => setTopUpAmount(e.target.value)} 
                      required 
                    />
                  </div>
                  <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '1rem' }} disabled={isSimulating}>
                    Trigger Airtm Deposit Callback
                  </button>
                </form>
              </div>

              <div className="glass-panel">
                <h2 className="section-title">
                  <ArrowDownLeft size={22} style={{ color: 'var(--error)' }} />
                  Airtm Withdrawal (Payout)
                </h2>
                <form onSubmit={handleWithdrawSubmit}>
                  <div className="form-group">
                    <label>Source Account</label>
                    <select 
                      className="form-select" 
                      value={withdrawTargetUser} 
                      onChange={e => setWithdrawTargetUser(e.target.value)}
                    >
                      <option value="usr_client">client@example.com</option>
                      <option value="usr_freelancer">freelancer@example.com</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Withdrawal Payout Amount (USDC)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={withdrawAmount} 
                      onChange={e => setWithdrawAmount(e.target.value)} 
                      required 
                    />
                  </div>
                  <button type="submit" className="btn btn-error" style={{ width: '100%', marginTop: '1rem' }} disabled={isSimulating}>
                    Initiate Airtm Withdrawal
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 4. TRANSACTION AUDIT */}
          {activeTab === 'logs' && (
            <div className="glass-panel">
              <h2 className="section-title">
                <RotateCcw size={22} style={{ color: 'var(--accent-purple)' }} />
                Audited Transaction History
              </h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>User Account</th>
                      <th>Operation</th>
                      <th>USDC Amount</th>
                      <th>Reconciliation Status</th>
                      <th>External Reference</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => {
                      const userEmail = users.find(u => u.id === t.userId)?.email || t.userId;
                      return (
                        <tr key={t.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{t.id}</td>
                          <td>{userEmail}</td>
                          <td>
                            <span style={{ fontWeight: '600', color: t.type.startsWith('ESCROW') ? 'var(--accent-cyan)' : 'inherit' }}>
                              {t.type}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600' }}>{t.amount.toFixed(2)} USDC</td>
                          <td>
                            <span className={`badge ${t.status === 'SUCCESS' ? 'badge-success' : t.status === 'PENDING' ? 'badge-pending' : 'badge-error'}`}>
                              {t.status}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{t.reference || 'Awaiting Worker...'}</td>
                          <td>{t.createdAt}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
