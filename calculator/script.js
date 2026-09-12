const screenPrimary = document.getElementById("screenPrimary");
const screenSecondary = document.getElementById("screenSecondary");
const keys = document.querySelectorAll(".key");

let currentValue = "0";
let previousValue = null;
let pendingOperator = null;
let waitingForNewValue = false;
let justEvaluated = false;

const MAX_DIGITS = 12;

function updateScreen() {
    screenPrimary.textContent = currentValue;
    if (pendingOperator && previousValue !== null) {
        screenSecondary.textContent = `${formatForDisplay(previousValue)} ${pendingOperator}`;
    } else {
        screenSecondary.textContent = "";
    }
}

function formatForDisplay(numStr) {
    if (numStr.includes(".")) {
        return numStr;
    }
    return numStr;
}

function inputDigit(digit) {
    if (justEvaluated) {
        currentValue = digit;
        previousValue = null;
        pendingOperator = null;
        justEvaluated = false;
    } else if (waitingForNewValue) {
        currentValue = digit;
        waitingForNewValue = false;
    } else if (currentValue === "0") {
        currentValue = digit;
    } else if (currentValue.replace("-", "").replace(".", "").length < MAX_DIGITS) {
        currentValue += digit;
    }
    updateScreen();
}

function inputDecimal() {
    if (justEvaluated) {
        currentValue = "0.";
        previousValue = null;
        pendingOperator = null;
        justEvaluated = false;
    } else if (waitingForNewValue) {
        currentValue = "0.";
        waitingForNewValue = false;
    } else if (!currentValue.includes(".")) {
        currentValue += ".";
    }
    updateScreen();
}

function clearAll() {
    currentValue = "0";
    previousValue = null;
    pendingOperator = null;
    waitingForNewValue = false;
    justEvaluated = false;
    updateScreen();
}

function backspace() {
    if (waitingForNewValue || justEvaluated) return;
    if (currentValue.length <= 1 || (currentValue.length === 2 && currentValue.startsWith("-"))) {
        currentValue = "0";
    } else {
        currentValue = currentValue.slice(0, -1);
    }
    updateScreen();
}

function inputPercent() {
    const value = parseFloat(currentValue);
    if (isNaN(value)) return;
    currentValue = trimResult(value / 100);
    updateScreen();
}

function compute(a, b, operator) {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    switch (operator) {
        case "+": return numA + numB;
        case "−": return numA - numB;
        case "×": return numA * numB;
        case "÷": return numB === 0 ? NaN : numA / numB;
        default: return numB;
    }
}

function trimResult(num) {
    if (!isFinite(num)) return "Error";
    let result = parseFloat(num.toPrecision(10)).toString();
    if (result.length > MAX_DIGITS + 2) {
        result = num.toExponential(4);
    }
    return result;
}

function setOperator(operator) {
    if (pendingOperator && !waitingForNewValue && !justEvaluated) {
        const result = compute(previousValue, currentValue, pendingOperator);
        currentValue = trimResult(result);
    }
    previousValue = currentValue;
    pendingOperator = operator;
    waitingForNewValue = true;
    justEvaluated = false;
    updateScreen();
    flashOperator(operator);
}

function flashOperator(operator) {
    document.querySelectorAll(".key-op").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.value === operator);
    });
}

function evaluate() {
    if (pendingOperator === null || previousValue === null) return;
    const result = compute(previousValue, currentValue, pendingOperator);
    currentValue = trimResult(result);
    previousValue = null;
    pendingOperator = null;
    waitingForNewValue = false;
    justEvaluated = true;
    document.querySelectorAll(".key-op").forEach((btn) => btn.classList.remove("active"));
    updateScreen();
}

keys.forEach((key) => {
    key.addEventListener("click", () => {
        const action = key.dataset.action;
        const value = key.dataset.value;

        switch (action) {
            case "digit": inputDigit(value); break;
            case "decimal": inputDecimal(); break;
            case "clear": clearAll(); break;
            case "backspace": backspace(); break;
            case "percent": inputPercent(); break;
            case "operator": setOperator(value); break;
            case "equals": evaluate(); break;
        }
    });
});

const KEY_TO_OPERATOR = {
    "+": "+",
    "-": "−",
    "*": "×",
    "/": "÷"
};

document.addEventListener("keydown", (e) => {
    if (e.key >= "0" && e.key <= "9") {
        inputDigit(e.key);
        pressVisual(`[data-action="digit"][data-value="${e.key}"]`);
        return;
    }
    if (e.key === ".") {
        inputDecimal();
        pressVisual('[data-action="decimal"]');
        return;
    }
    if (KEY_TO_OPERATOR[e.key]) {
        e.preventDefault();
        setOperator(KEY_TO_OPERATOR[e.key]);
        pressVisual(`[data-value="${KEY_TO_OPERATOR[e.key]}"]`);
        return;
    }
    if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        evaluate();
        pressVisual('[data-action="equals"]');
        return;
    }
    if (e.key === "Backspace") {
        backspace();
        pressVisual('[data-action="backspace"]');
        return;
    }
    if (e.key === "Escape") {
        clearAll();
        pressVisual('[data-action="clear"]');
        return;
    }
    if (e.key === "%") {
        inputPercent();
        pressVisual('[data-action="percent"]');
        return;
    }
});

function pressVisual(selector) {
    const btn = document.querySelector(selector);
    if (!btn) return;
    btn.classList.add("pressed");
    setTimeout(() => btn.classList.remove("pressed"), 100);
}

updateScreen();