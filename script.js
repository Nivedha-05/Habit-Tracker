/* ============================================
   HABIT TRACKER - JAVASCRIPT
   ============================================ */

// ============================================
// CONSTANTS & STATE
// ============================================

const STORAGE_KEY = 'habits_data';
const LAST_RESET_KEY = 'last_reset_date';

// Local state to manage habits
let habits = [];

// Get DOM elements
const habitInput = document.getElementById('habitInput');
const tagSelect = document.getElementById('tagSelect');
const prioritySelect = document.getElementById('prioritySelect');
const reminderSelect = document.getElementById('reminderSelect');
const habitNotes = document.getElementById('habitNotes');
const addBtn = document.getElementById('addBtn');
const habitsList = document.getElementById('habitsList');
const progressPercentage = document.getElementById('progressPercentage');
const progressBar = document.querySelector('.progress-bar');

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the application on page load
 * - Load habits from localStorage
 * - Reset daily if new day
 * - Render habit list
 * - Update progress bar
 */
function init() {
    loadHabitsFromStorage();
    resetHabitsIfNewDay();
    renderHabits();
    updateProgress();
    attachEventListeners();
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Attach all event listeners for user interactions
 */
function attachEventListeners() {
    // Add habit button click
    addBtn.addEventListener('click', handleAddHabit);

    // Enter key in habit input
    habitInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAddHabit();
        }
    });

    // Clear input when focused
    habitInput.addEventListener('focus', () => {
        habitInput.value = '';
    });

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleTabSwitch(e.target.dataset.tab);
        });
    });
}

// ============================================
// HABIT MANAGEMENT FUNCTIONS
// ============================================

/**
 * Handle adding a new habit
 * - Validate input
 * - Create habit object
 * - Add to state
 * - Save to storage
 * - Re-render UI
 */
function handleAddHabit() {
    const habitName = habitInput.value.trim();
    const tag = tagSelect.value;
    const priority = prioritySelect.value;
    const reminder = reminderSelect.value;
    const notes = habitNotes.value.trim();

    // Validation
    if (!habitName) {
        alert('Please enter a habit name');
        habitInput.focus();
        return;
    }

    // Create new habit object
    const newHabit = {
        id: Date.now(), // Use timestamp as unique ID
        name: habitName,
        tag: tag,
        priority: priority,
        reminder: reminder,
        notes: notes,
        completed: false,
        createdAt: new Date().toLocaleDateString(),
        streak: 0,
        lastCompletedDate: null
    };

    // Add to state
    habits.push(newHabit);

    // Save to localStorage
    saveHabitsToStorage();

    // Update UI
    renderHabits();
    updateProgress();

    // Clear input
    habitInput.value = '';
    habitNotes.value = '';
    prioritySelect.value = 'Medium';
    reminderSelect.value = 'Evening';
    habitInput.focus();
}

/**
 * Handle toggling a habit's completion status
 * @param {number} habitId - The unique ID of the habit
 */
function handleToggleHabit(habitId) {
    // Find and toggle the habit
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
        habit.completed = !habit.completed;
        
        // Update streak when completing/uncompleting a habit
        if (habit.completed) {
            updateHabitStreak(habit);
        } else {
            // If uncompleting, reduce streak
            if (habit.streak > 0) {
                habit.streak--;
            }
            habit.lastCompletedDate = null;
        }
        
        saveHabitsToStorage();
        updateProgress();
        renderHabits();
    }
}

/**
 * Update the streak for a habit when it's completed
 * @param {Object} habit - The habit object
 */
function updateHabitStreak(habit) {
    const today = getDateString(new Date());
    
    console.log(`[STREAK DEBUG] Habit: ${habit.name}`);
    console.log(`[STREAK DEBUG] Today: ${today}`);
    console.log(`[STREAK DEBUG] Last completed: ${habit.lastCompletedDate}`);
    console.log(`[STREAK DEBUG] Current streak: ${habit.streak}`);
    
    if (!habit.lastCompletedDate) {
        // First time completing this habit
        habit.streak = 1;
        habit.lastCompletedDate = today;
        console.log(`[STREAK DEBUG] First completion - streak set to 1`);
    } else if (habit.lastCompletedDate === today) {
        // Already completed today, don't increment
        console.log(`[STREAK DEBUG] Already completed today - no change`);
        return;
    } else {
        // Calculate the difference in days using timezone-safe method
        const lastDate = parseDate(habit.lastCompletedDate);
        const todayDate = parseDate(today);
        
        // Get difference in days
        const dayDifference = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
        console.log(`[STREAK DEBUG] Day difference: ${dayDifference}`);
        
        if (dayDifference === 1) {
            // Consecutive day, increment streak
            habit.streak++;
            habit.lastCompletedDate = today;
            console.log(`[STREAK DEBUG] Consecutive day - streak incremented to ${habit.streak}`);
        } else {
            // Not consecutive (missed day or completed in future), reset streak to 1
            habit.streak = 1;
            habit.lastCompletedDate = today;
            console.log(`[STREAK DEBUG] Non-consecutive day - streak reset to 1`);
        }
    }
    console.log(`[STREAK DEBUG] Final streak: ${habit.streak}`);
}

/**
 * Helper function to get consistent date string (YYYY-MM-DD)
 * @param {Date} date - The date object
 * @returns {string} - Date in YYYY-MM-DD format
 */
function getDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Helper function to parse date string
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Date} - Date object at midnight in local timezone
 */
function parseDate(dateString) {
    // Split the date string to avoid timezone issues
    const [year, month, day] = dateString.split('-');
    // Create date at midnight in local timezone
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Handle deleting a habit
 * @param {number} habitId - The unique ID of the habit
 */
function handleDeleteHabit(habitId) {
    // Remove habit from state
    habits = habits.filter(h => h.id !== habitId);
    
    // Save to localStorage
    saveHabitsToStorage();
    
    // Update UI
    renderHabits();
    updateProgress();
}

/**
 * Reset habits daily at midnight
 * - Check if date has changed since last reset
 * - Reset all completed statuses to false
 * - Keep streak data intact
 * - Update last reset date
 */
function resetHabitsIfNewDay() {
    const today = getDateString(new Date());
    const lastResetDate = localStorage.getItem(LAST_RESET_KEY);
    
    // If today is different from last reset date, reset all habits
    if (lastResetDate !== today) {
        habits.forEach(habit => {
            habit.completed = false;
        });
        
        // Save the reset
        saveHabitsToStorage();
        localStorage.setItem(LAST_RESET_KEY, today);
    }
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

/**
 * Render all habits to the DOM
 * - Clear existing habits
 * - Check if empty
 * - Create habit cards for each habit
 */
function renderHabits() {
    habitsList.innerHTML = '';

    // Show empty state if no habits
    if (habits.length === 0) {
        habitsList.innerHTML = `
            <div class="empty-state">
                <p>No habits yet. Add one to get started! 🚀</p>
            </div>
        `;
        return;
    }

    // Render each habit
    habits.forEach(habit => {
        const habitCard = createHabitCard(habit);
        habitsList.appendChild(habitCard);
    });
}

/**
 * Create a habit card element
 * @param {Object} habit - The habit object
 * @returns {HTMLElement} - The habit card DOM element
 */
function createHabitCard(habit) {
    // Create main container
    const card = document.createElement('div');
    card.className = `habit-item ${habit.completed ? 'completed' : ''}`;
    card.dataset.habitId = habit.id;

    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'habit-checkbox';
    checkbox.checked = habit.completed;
    checkbox.addEventListener('change', () => handleToggleHabit(habit.id));

    // Create content container
    const content = document.createElement('div');
    content.className = 'habit-content';

    // Create habit name and streak container
    const nameAndStreak = document.createElement('div');
    nameAndStreak.className = 'habit-name-streak';

    // Create habit name
    const name = document.createElement('div');
    name.className = 'habit-name';
    name.textContent = habit.name;

    // Create streak badge
    const streakBadge = document.createElement('div');
    streakBadge.className = 'streak-badge';
    streakBadge.innerHTML = `🔥 ${habit.streak}`;

    nameAndStreak.appendChild(name);
    nameAndStreak.appendChild(streakBadge);

    // Create meta info container (tag, priority, reminder)
    const metaInfo = document.createElement('div');
    metaInfo.className = 'habit-meta';

    // Create tag badge
    const tag = document.createElement('span');
    tag.className = `tag tag-${habit.tag.toLowerCase()}`;
    tag.textContent = habit.tag;

    // Create priority badge
    const priority = document.createElement('span');
    priority.className = `priority priority-${habit.priority.toLowerCase()}`;
    priority.textContent = habit.priority;

    // Create reminder badge
    const reminder = document.createElement('span');
    reminder.className = 'reminder';
    reminder.textContent = `⏰ ${habit.reminder}`;

    metaInfo.appendChild(tag);
    metaInfo.appendChild(priority);
    metaInfo.appendChild(reminder);

    // Create notes if they exist
    let notesDiv = null;
    if (habit.notes) {
        notesDiv = document.createElement('div');
        notesDiv.className = 'habit-notes-display';
        notesDiv.textContent = habit.notes;
    }

    // Append elements to content
    content.appendChild(nameAndStreak);
    content.appendChild(metaInfo);
    if (notesDiv) {
        content.appendChild(notesDiv);
    }

    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => handleDeleteHabit(habit.id));

    // Assemble card
    card.appendChild(checkbox);
    card.appendChild(content);
    card.appendChild(deleteBtn);

    return card;
}

// ============================================
// PROGRESS BAR FUNCTIONS
// ============================================

/**
 * Update the circular progress bar
 * - Calculate completion percentage
 * - Update SVG stroke-dashoffset
 * - Update percentage text
 * - Add smooth animation
 */
function updateProgress() {
    // Calculate percentage
    const completedCount = habits.filter(h => h.completed).length;
    const totalCount = habits.length;
    const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    // Update percentage text
    progressPercentage.textContent = `${percentage}%`;

    // Update SVG progress circle
    // Circle circumference: 2 * π * r = 2 * π * 54 ≈ 339.29
    const circumference = 339.29;
    const offset = circumference - (percentage / 100) * circumference;
    progressBar.style.strokeDashoffset = offset;

    // Add SVG gradient (inject if not exists)
    if (!document.querySelector('#progressGradient')) {
        const svg = document.querySelector('.progress-circle');
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.id = 'progressGradient';
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '100%');

        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#D391B0');

        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', '#BA6E8F');

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        svg.insertBefore(defs, svg.firstChild);
    }
}

// ============================================
// LOCAL STORAGE FUNCTIONS
// ============================================

/**
 * Save habits to browser's localStorage
 * - Convert habits array to JSON
 * - Store with STORAGE_KEY
 */
function saveHabitsToStorage() {
    try {
        const habitsJSON = JSON.stringify(habits);
        localStorage.setItem(STORAGE_KEY, habitsJSON);
    } catch (error) {
        console.error('Error saving habits to localStorage:', error);
    }
}

/**
 * Load habits from browser's localStorage
 * - Retrieve JSON string
 * - Parse to array
 * - Update global habits state
 */
function loadHabitsFromStorage() {
    try {
        const habitsJSON = localStorage.getItem(STORAGE_KEY);
        if (habitsJSON) {
            habits = JSON.parse(habitsJSON);
        } else {
            habits = [];
        }
    } catch (error) {
        console.error('Error loading habits from localStorage:', error);
        habits = [];
    }
}

// ============================================
// TAB SWITCHING FUNCTIONS
// ============================================

/**
 * Handle switching between tabs
 * @param {string} tabName - The name of the tab to switch to ('daily' or 'weekly')
 */
function handleTabSwitch(tabName) {
    // Update tab button states
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update tab content visibility
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        if (content.id === `${tabName}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}



// ============================================
// START APPLICATION
// ============================================

// Run initialization when DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
