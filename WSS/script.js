// DOM Elements
const mainTankLevel = document.getElementById('main-tank-level');
const mainTankPercentage = document.getElementById('main-tank-percentage');
const mainTankStatus = document.getElementById('main-tank-status');
const pumpStatus = document.getElementById('pump-status');
const pumpOnBtn = document.getElementById('pump-on-btn');
const pumpOffBtn = document.getElementById('pump-off-btn');
const autoModeSwitch = document.getElementById('auto-mode');
const eventLogTable = document.querySelector('#event-log tbody');
const waterLevelChartCtx = document.getElementById('waterLevelChart').getContext('2d');
const timeRangeButtons = document.querySelectorAll('.time-btn');
const logSearch = document.getElementById('log-search');
const clearLogsBtn = document.getElementById('clear-logs-btn');
const alertModal = document.getElementById('alert-modal');
const alertTitle = document.getElementById('alert-title');
const alertMessage = document.getElementById('alert-message');
const alertAcknowledge = document.getElementById('alert-acknowledge');
const closeModal = document.querySelector('.close-modal');

// System State
let systemState = {
    autoMode: false,
    pumpRunning: false,
    tankLevel: 0,
    historicalData: [],
    alerts: [],
    events: []
};

// Initialize Chart
const waterLevelChart = new Chart(waterLevelChartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Water Level (%)',
            data: [],
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                title: {
                    display: true,
                    text: 'Water Level (%)'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Time'
                }
            }
        },
        plugins: {
            tooltip: {
                mode: 'index',
                intersect: false
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    }
});

// Simulate data fetching from server
function fetchWaterLevelData() {
    // In a real implementation, this would be an API call
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulate slight variations in water level
            const variation = (Math.random() * 10) - 5; // -5 to +5
            let newLevel = systemState.tankLevel + variation;
            
            // Ensure level stays between 0-100%
            newLevel = Math.max(0, Math.min(100, newLevel));
            
            // Simulate pump effect in auto mode
            if (systemState.autoMode) {
                if (newLevel < 20 && !systemState.pumpRunning) {
                    systemState.pumpRunning = true;
                    logSystemEvent('Pump automatically turned ON due to low water level', 'info');
                } else if (newLevel > 80 && systemState.pumpRunning) {
                    systemState.pumpRunning = false;
                    logSystemEvent('Pump automatically turned OFF due to high water level', 'info');
                }
                
                // Adjust level based on pump state
                if (systemState.pumpRunning) {
                    newLevel += 5; // Pump filling
                } else {
                    newLevel -= 2; // Natural usage
                }
                
                // Re-clamp after adjustment
                newLevel = Math.max(0, Math.min(100, newLevel));
            }
            
            resolve(newLevel);
        }, 1000);
    });
}

// Update dashboard with current data
async function updateDashboard() {
    try {
        const newLevel = await fetchWaterLevelData();
        systemState.tankLevel = newLevel;
        
        // Update tank level display
        mainTankLevel.style.width = `${newLevel}%`;
        mainTankPercentage.textContent = newLevel.toFixed(1);
        
        // Update tank status text and color
        if (newLevel < 20) {
            mainTankStatus.textContent = 'CRITICALLY LOW';
            mainTankStatus.style.color = 'var(--danger-color)';
            
            // Trigger alert if not already triggered
            if (!systemState.alerts.includes('low_water')) {
                showAlert('Water Level Critical', `Water level is critically low at ${newLevel.toFixed(1)}%. Please check supply.`);
                systemState.alerts.push('low_water');
            }
        } else if (newLevel < 40) {
            mainTankStatus.textContent = 'Low';
            mainTankStatus.style.color = 'var(--warning-color)';
            
            // Remove low water alert if level recovers
            const index = systemState.alerts.indexOf('low_water');
            if (index > -1) {
                systemState.alerts.splice(index, 1);
            }
        } else if (newLevel < 70) {
            mainTankStatus.textContent = 'Medium';
            mainTankStatus.style.color = 'var(--info-color)';
        } else if (newLevel < 90) {
            mainTankStatus.textContent = 'High';
            mainTankStatus.style.color = 'var(--success-color)';
        } else {
            mainTankStatus.textContent = 'FULL';
            mainTankStatus.style.color = 'var(--danger-color)';
            
            // Trigger alert if not already triggered
            if (!systemState.alerts.includes('high_water')) {
                showAlert('Water Level High', `Water level is high at ${newLevel.toFixed(1)}%. Risk of overflow.`);
                systemState.alerts.push('high_water');
            }
        }
        
        // Update pump status
        pumpStatus.textContent = systemState.pumpRunning ? 'ON' : 'OFF';
        pumpStatus.style.color = systemState.pumpRunning ? 'var(--success-color)' : 'var(--danger-color)';
        
        // Update chart data
        const now = new Date();
        const timeLabel = now.toLocaleTimeString();
        
        // Add to historical data (keep last 100 points for demo)
        systemState.historicalData.push({
            time: now,
            level: newLevel
        });
        
        if (systemState.historicalData.length > 100) {
            systemState.historicalData.shift();
        }
        
        // Update chart
        updateChartData();
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
        logSystemEvent('Error fetching water level data', 'error');
    }
}

// Update chart with current data range
function updateChartData(range = '1h') {
    const now = new Date();
    let cutoffTime;
    
    switch (range) {
        case '1h':
            cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
            break;
        case '6h':
            cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            break;
        case '24h':
            cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        default:
            cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
    }
    
    const filteredData = systemState.historicalData.filter(
        entry => entry.time >= cutoffTime
    );
    
    waterLevelChart.data.labels = filteredData.map(
        entry => entry.time.toLocaleTimeString()
    );
    waterLevelChart.data.datasets[0].data = filteredData.map(
        entry => entry.level
    );
    waterLevelChart.update();
}

// Log system events
function logSystemEvent(message, severity = 'info') {
    const now = new Date();
    const event = {
        timestamp: now,
        message: message,
        severity: severity
    };
    
    systemState.events.unshift(event); // Add to beginning of array
    
    // Keep only the last 100 events
    if (systemState.events.length > 100) {
        systemState.events.pop();
    }
    
    // Update event log display
    updateEventLog();
    
    // Return the event for potential further processing
    return event;
}

// Update event log display
function updateEventLog(filter = '') {
    eventLogTable.innerHTML = '';
    
    const filteredEvents = filter 
        ? systemState.events.filter(event => 
            event.message.toLowerCase().includes(filter.toLowerCase()))
        : systemState.events;
    
    filteredEvents.forEach(event => {
        const row = document.createElement('tr');
        
        // Set row class based on severity
        switch (event.severity) {
            case 'error':
                row.classList.add('error-row');
                break;
            case 'warning':
                row.classList.add('warning-row');
                break;
            default:
                row.classList.add('info-row');
        }
        
        row.innerHTML = `
            <td>${event.timestamp.toLocaleTimeString()}</td>
            <td>${event.message}</td>
            <td>${event.severity.toUpperCase()}</td>
        `;
        
        eventLogTable.appendChild(row);
    });
}

// Show alert modal
function showAlert(title, message) {
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alertModal.style.display = 'block';
    
    // Log the alert
    logSystemEvent(`ALERT: ${title} - ${message}`, 'error');
}

// Event Listeners
pumpOnBtn.addEventListener('click', () => {
    if (!systemState.pumpRunning) {
        systemState.pumpRunning = true;
        logSystemEvent('Pump manually turned ON', 'info');
    }
});

pumpOffBtn.addEventListener('click', () => {
    if (systemState.pumpRunning) {
        systemState.pumpRunning = false;
        logSystemEvent('Pump manually turned OFF', 'info');
    }
});

autoModeSwitch.addEventListener('change', () => {
    systemState.autoMode = autoModeSwitch.checked;
    const mode = systemState.autoMode ? 'ON' : 'OFF';
    logSystemEvent(`Auto mode turned ${mode}`, 'info');
});

timeRangeButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        timeRangeButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');
        // Update chart with selected range
        updateChartData(button.dataset.range);
    });
});

logSearch.addEventListener('input', () => {
    updateEventLog(logSearch.value);
});

clearLogsBtn.addEventListener('click', () => {
    systemState.events = [];
    updateEventLog();
});

alertAcknowledge.addEventListener('click', () => {
    alertModal.style.display = 'none';
});

closeModal.addEventListener('click', () => {
    alertModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === alertModal) {
        alertModal.style.display = 'none';
    }
});

// Initialize dashboard
function initializeDashboard() {
    // Set initial tank level (simulate)
    systemState.tankLevel = 45;
    
    // Populate with some initial data
    const now = new Date();
    for (let i = 0; i < 30; i++) {
        const time = new Date(now.getTime() - (30 - i) * 2 * 60 * 1000);
        const level = 40 + Math.sin(i / 3) * 30 + (Math.random() * 10 - 5);
        systemState.historicalData.push({
            time: time,
            level: Math.max(0, Math.min(100, level))
        });
    }
    
    // Add some initial logs
    logSystemEvent('System initialized', 'info');
    logSystemEvent('Connected to water level sensor', 'info');
    logSystemEvent('Pump control system ready', 'info');
    
    // Update dashboard immediately
    updateDashboard();
    
    // Set up periodic updates
    setInterval(updateDashboard, 5000);
}

// Start the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDashboard);