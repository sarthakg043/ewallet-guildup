import axios from 'axios';
import { useEffect, useState } from 'react';
import LogoutButton from '../components/LogoutButton';


function Dashboard() {
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [amount, setAmount] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [receiverId, setReceiverId] = useState('');
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState(localStorage.getItem('userId'));
    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        setUserId(localStorage.getItem('userId'));
        fetchBalance();
        fetchTransactions();
    }, []);
  
    const fetchBalance = async () => {
      try {
        const response = await axios.get(`${API_URL}/wallet/balance?userId=${userId}`);
        setBalance(response.data.balance);
      } catch (error) {
        alert('Error fetching balance');
      }
    };
  
    const fetchTransactions = async () => {
      try {
        const response = await axios.get(`${API_URL}/wallet/transactions?userId=${userId}`);
        setTransactions(response.data);
      } catch (error) {
        alert('Error fetching transactions');
      }
    };
  
    const handleDeposit = async () => {
      setLoading(true);
      try {
        await axios.post(`${API_URL}/wallet/deposit`, { userId, amount: Number(amount) });
        alert('Deposit successful');
        fetchBalance();
        fetchTransactions();
        setAmount('');
      } catch (error) {
        alert('Error making deposit');
      }
      setLoading(false);
    };
  
    const handleWithdraw = async () => {
      setLoading(true);
      try {
        await axios.post(`${API_URL}/wallet/withdraw`, { userId, amount: Number(amount) });
        alert('Withdrawal successful');
        fetchBalance();
        fetchTransactions();
        setAmount('');
      } catch (error) {
        alert('Error making withdrawal');
      }
      setLoading(false);
    };
  
    const handleTransfer = async () => {
      setLoading(true);
      try {
        await axios.post(`${API_URL}/wallet/transfer`, {
          senderId: userId,
          receiverId,
          amount: Number(transferAmount),
        });
        alert('Transfer successful');
        fetchBalance();
        fetchTransactions();
        setTransferAmount('');
        setReceiverId('');
      } catch (error) {
        alert('Error making transfer');
      }
      setLoading(false);
    };
  
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            {/* grid of 3 columns */}
            <div className='flex gap-2 justify-between items-center'>
                <h1 className="text-3xl text-center font-bold mb-4">E-Wallet Dashboard</h1>
                <LogoutButton />
            </div>
            <h2 className="text-2xl font-medium mb-4">{localStorage.getItem('username') || "Username"}</h2>
            <div className="text-2xl mb-6">
              Balance: ${balance.toFixed(2)}
            </div>
  
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Deposit/Withdraw</h2>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2 border rounded mb-4"
                  placeholder="Amount"
                />
                <div className="flex gap-4">
                  <button
                    onClick={handleDeposit}
                    disabled={loading}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Deposit
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={loading}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
  
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Transfer</h2>
                <input
                  type="text"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  className="w-full p-2 border rounded mb-4"
                  placeholder="Receiver ID"
                />
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full p-2 border rounded mb-4"
                  placeholder="Amount"
                />
                <button
                  onClick={handleTransfer}
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Transfer
                </button>
              </div>
            </div>
  
            <div>
              <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Amount</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction._id} className="border-b">
                        <td className="p-2">{transaction.type}</td>
                        <td className="p-2">${transaction.amount.toFixed(2)}</td>
                        <td className="p-2">{transaction.status}</td>
                        <td className="p-2">
                          {new Date(transaction.timestamp).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  export default Dashboard;