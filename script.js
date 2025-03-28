document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const transactionForm = document.getElementById('transaction-form');
    const transactionsList = document.getElementById('transactions-list');
    const balanceElement = document.getElementById('balance');
    const incomeElement = document.getElementById('income');
    const expenseElement = document.getElementById('expense');
    const filterType = document.getElementById('filter-type');
    const filterCategory = document.getElementById('filter-category');
    const filterMonth = document.getElementById('filter-month');
    const saveBudgetsBtn = document.getElementById('save-budgets');
    const modal = document.getElementById('alert-modal');
    const alertMessage = document.getElementById('alert-message');
    const closeModal = document.querySelector('.close');

    // Initialize charts
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    let categoryChart, monthlyChart;

    // Initialize data
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let budgets = JSON.parse(localStorage.getItem('budgets')) || {
        food: 0,
        rent: 0,
        entertainment: 0,
        other: 0
    };

    // Initialize the app
    init();

    function init() {
        // Load budgets into form
        document.getElementById('food-budget').value = budgets.food;
        document.getElementById('rent-budget').value = budgets.rent;
        document.getElementById('entertainment-budget').value = budgets.entertainment;
        document.getElementById('other-budget').value = budgets.other;

        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;

        // Populate month filter
        populateMonthFilter();

        // Update UI
        updateSummary();
        updateTransactionList();
        updateCharts();

        // Set up event listeners
        setupEventListeners();
    }

    function setupEventListeners() {
        // Form submission
        transactionForm.addEventListener('submit', addTransaction);

        // Filter changes
        filterType.addEventListener('change', updateTransactionList);
        filterCategory.addEventListener('change', updateTransactionList);
        filterMonth.addEventListener('change', updateTransactionList);

        // Save budgets
        saveBudgetsBtn.addEventListener('click', saveBudgets);

        // Close modal
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    function populateMonthFilter() {
        const months = new Set();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];

        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            months.add(monthYear);
        });

        // Clear existing options except the first one
        while (filterMonth.options.length > 1) {
            filterMonth.remove(1);
        }

        // Add months to filter
        months.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = month;
            filterMonth.appendChild(option);
        });
    }

    function addTransaction(e) {
        e.preventDefault();

        const type = document.getElementById('type').value;
        const category = document.getElementById('category').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const description = document.getElementById('description').value;
        const date = document.getElementById('date').value;

        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const transaction = {
            id: Date.now(),
            type,
            category,
            amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
            description,
            date
        };

        transactions.push(transaction);
        saveTransactions();
        updateSummary();
        updateTransactionList();
        updateCharts();
        checkBudgetAlerts(transaction);
        populateMonthFilter();

        // Reset form
        transactionForm.reset();
        document.getElementById('date').value = today;
    }

    function deleteTransaction(id) {
        transactions = transactions.filter(transaction => transaction.id !== id);
        saveTransactions();
        updateSummary();
        updateTransactionList();
        updateCharts();
        populateMonthFilter();
    }

    function saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    function saveBudgets() {
        budgets = {
            food: parseFloat(document.getElementById('food-budget').value) || 0,
            rent: parseFloat(document.getElementById('rent-budget').value) || 0,
            entertainment: parseFloat(document.getElementById('entertainment-budget').value) || 0,
            other: parseFloat(document.getElementById('other-budget').value) || 0
        };

        localStorage.setItem('budgets', JSON.stringify(budgets));
        alert('Budgets saved successfully!');
        checkAllBudgetAlerts();
    }

    function updateSummary() {
        const amounts = transactions.map(transaction => transaction.amount);
        const total = amounts.reduce((acc, item) => acc + item, 0).toFixed(2);
        const income = amounts
            .filter(item => item > 0)
            .reduce((acc, item) => acc + item, 0)
            .toFixed(2);
        const expense = (amounts
            .filter(item => item < 0)
            .reduce((acc, item) => acc + item, 0) * -1)
            .toFixed(2);

        balanceElement.textContent = `$${total}`;
        incomeElement.textContent = `$${income}`;
        expenseElement.textContent = `$${expense}`;
    }

    function updateTransactionList() {
        const type = filterType.value;
        const category = filterCategory.value;
        const month = filterMonth.value;

        let filteredTransactions = [...transactions];

        // Apply filters
        if (type !== 'all') {
            filteredTransactions = filteredTransactions.filter(
                transaction => transaction.type === type
            );
        }

        if (category !== 'all') {
            filteredTransactions = filteredTransactions.filter(
                transaction => transaction.category === category
            );
        }

        if (month !== 'all') {
            const [monthName, year] = month.split(' ');
            const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();

            filteredTransactions = filteredTransactions.filter(transaction => {
                const date = new Date(transaction.date);
                return date.getMonth() === monthIndex && date.getFullYear() == year;
            });
        }

        // Sort by date (newest first)
        filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Clear the table
        transactionsList.innerHTML = '';

        // Add transactions to the table
        if (filteredTransactions.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="6" style="text-align: center;">No transactions found</td>`;
            transactionsList.appendChild(row);
        } else {
            filteredTransactions.forEach(transaction => {
                const row = document.createElement('tr');
                const amountClass = transaction.amount > 0 ? 'income' : 'expense';
                const amountDisplay = Math.abs(transaction.amount).toFixed(2);
                const typeDisplay = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
                const categoryDisplay = transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1);

                row.innerHTML = `
                    <td>${formatDate(transaction.date)}</td>
                    <td>${typeDisplay}</td>
                    <td>${categoryDisplay}</td>
                    <td>${transaction.description}</td>
                    <td class="${amountClass}">$${amountDisplay}</td>
                    <td><button class="delete-btn" data-id="${transaction.id}">Delete</button></td>
                `;
                transactionsList.appendChild(row);
            });

            // Add event listeners to delete buttons
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = parseInt(e.target.getAttribute('data-id'));
                    deleteTransaction(id);
                });
            });
        }
    }

    function updateCharts() {
        // Destroy existing charts if they exist
        if (categoryChart) categoryChart.destroy();
        if (monthlyChart) monthlyChart.destroy();

        // Prepare data for category chart
        const categories = ['food', 'rent', 'entertainment', 'other'];
        const expenseData = categories.map(category => {
            return Math.abs(transactions
                .filter(t => t.type === 'expense' && t.category === category)
                .reduce((sum, t) => sum + t.amount, 0));
        });

        const incomeData = categories.map(category => {
            return transactions
                .filter(t => t.type === 'income' && t.category === category)
                .reduce((sum, t) => sum + t.amount, 0);
        });

        // Category Chart
        categoryChart = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: 'rgba(52, 152, 219, 0.7)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        backgroundColor: 'rgba(231, 76, 60, 0.7)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Income vs Expenses by Category'
                    }
                }
            }
        });

        // Prepare data for monthly chart
        const monthlyData = {};
        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = { income: 0, expense: 0 };
            }
            
            if (transaction.amount > 0) {
                monthlyData[monthYear].income += transaction.amount;
            } else {
                monthlyData[monthYear].expense += Math.abs(transaction.amount);
            }
        });

        const sortedMonths = Object.keys(monthlyData).sort();
        const monthlyLabels = sortedMonths.map(month => {
            const [year, monthNum] = month.split('-');
            return new Date(year, monthNum - 1).toLocaleDateString('default', { month: 'short', year: 'numeric' });
        });

        const monthlyIncomeData = sortedMonths.map(month => monthlyData[month].income);
        const monthlyExpenseData = sortedMonths.map(month => monthlyData[month].expense);

        // Monthly Chart
        monthlyChart = new Chart(monthlyCtx, {
            type: 'line',
            data: {
                labels: monthlyLabels,
                datasets: [
                    {
                        label: 'Income',
                        data: monthlyIncomeData,
                        backgroundColor: 'rgba(52, 152, 219, 0.2)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: true
                    },
                    {
                        label: 'Expenses',
                        data: monthlyExpenseData,
                        backgroundColor: 'rgba(231, 76, 60, 0.2)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Income vs Expenses'
                    }
                }
            }
        });
    }

    function checkBudgetAlerts(transaction) {
        if (transaction.type !== 'expense') return;

        const category = transaction.category;
        const budgetLimit = budgets[category];
        if (budgetLimit <= 0) return; // No budget set for this category

        const categoryExpenses = Math.abs(transactions
            .filter(t => t.type === 'expense' && t.category === category)
            .reduce((sum, t) => sum + t.amount, 0));

        const percentage = (categoryExpenses / budgetLimit) * 100;

        if (percentage >= 90 && percentage < 100) {
            showAlert(`You've reached ${Math.round(percentage)}% of your ${category} budget ($${categoryExpenses.toFixed(2)} of $${budgetLimit.toFixed(2)})`);
        } else if (percentage >= 100) {
            showAlert(`You've exceeded your ${category} budget by $${(categoryExpenses - budgetLimit).toFixed(2)}!`);
        }
    }

    function checkAllBudgetAlerts() {
        const categories = ['food', 'rent', 'entertainment', 'other'];
        
        categories.forEach(category => {
            const budgetLimit = budgets[category];
            if (budgetLimit <= 0) return;

            const categoryExpenses = Math.abs(transactions
                .filter(t => t.type === 'expense' && t.category === category)
                .reduce((sum, t) => sum + t.amount, 0));

            const percentage = (categoryExpenses / budgetLimit) * 100;

            if (percentage >= 90) {
                showAlert(`You've reached ${Math.round(percentage)}% of your ${category} budget ($${categoryExpenses.toFixed(2)} of $${budgetLimit.toFixed(2)})`);
            }
        });
    }

    function showAlert(message) {
        alertMessage.textContent = message;
        modal.style.display = 'block';
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
});