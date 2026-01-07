const authForm = document.getElementById('auth-form');
const nameGroup = document.getElementById('name-group');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const submitBtn = document.getElementById('submit-btn');
const toggleText = document.getElementById('toggle-text');
const toggleLink = document.getElementById('toggle-auth');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// Check URL params for mode
const urlParams = new URLSearchParams(window.location.search);
let isSignUp = urlParams.get('mode') === 'signup';

function updateUI() {
    if (isSignUp) {
        authTitle.innerText = "Create Account";
        authSubtitle.innerText = "Get started with your free account.";
        nameGroup.classList.remove('hidden');
        submitBtn.innerText = "Sign Up";
        toggleText.innerText = "Already have an account?";
        toggleLink.innerText = "Sign In";
        nameInput.setAttribute('required', 'true');
    } else {
        authTitle.innerText = "Welcome Back";
        authSubtitle.innerText = "Please enter your details to sign in.";
        nameGroup.classList.add('hidden');
        submitBtn.innerText = "Sign In";
        toggleText.innerText = "Don't have an account?";
        toggleLink.innerText = "Sign Up";
        nameInput.removeAttribute('required');
    }
}

updateUI();

toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUp = !isSignUp;
    updateUI();
});

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    const name = nameInput.value;

    if (isSignUp) {
        // Mock Sign Up
        const user = { name, email, password };
        localStorage.setItem('user_' + email, JSON.stringify(user));
        alert('Account created successfully! Please Sign In.');
        isSignUp = false;
        updateUI();
    } else {
        // Mock Sign In
        const storedUserJSON = localStorage.getItem('user_' + email);
        if (storedUserJSON) {
            const storedUser = JSON.parse(storedUserJSON);
            if (storedUser.password === password) {
                // Login Success
                localStorage.setItem('currentUser', JSON.stringify(storedUser));
                window.location.href = 'dashboard.html';
            } else {
                alert('Invalid password.');
            }
        } else {
            alert('User not found. Please Sign Up.');
        }
    }
});
