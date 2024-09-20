// app.js
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
let isDrawing = false;
let path = [];

// Set a large brush size
const brushSize = 8;

// Get controls
const coefficientsSlider = document.getElementById('coefficients');
const coeffValueDisplay = document.getElementById('coeffValue');
const clearButton = document.getElementById('clearButton');
const approximateButton = document.getElementById('approximateButton');

// Update coefficient display
coefficientsSlider.oninput = function() {
    coeffValueDisplay.textContent = this.value;
};

// Event listeners for drawing
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', endDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseleave', endDrawing);

// Event listeners for buttons
clearButton.addEventListener('click', clearCanvas);
approximateButton.addEventListener('click', startApproximation);

function startDrawing(e) {
    isDrawing = true;
    path = [];
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    draw(e);
}

function endDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.closePath();
}

function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    path.push({ x, y });

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    path = [];
    // Clear the Fourier equation display
    document.getElementById('fourierEquation').innerHTML = '';
}

let fourierCoefficients = [];

function startApproximation() {
    if (path.length === 0) {
        alert('Please draw something first.');
        return;
    }
    computeFourierCoefficients();
    visualizeApproximation();
}

function computeFourierCoefficients() {
    const N = path.length;
    const numCoefficients = parseInt(coefficientsSlider.value);
    fourierCoefficients = [];

    // Convert the path to complex numbers
    let complexPath = path.map(point => {
        return { re: point.x - canvas.width / 2, im: point.y - canvas.height / 2 };
    });

    // Compute DFT
    for (let k = 0; k < numCoefficients; k++) {
        let sum = { re: 0, im: 0 };
        for (let n = 0; n < N; n++) {
            const phi = (2 * Math.PI * k * n) / N;
            const cosPhi = Math.cos(phi);
            const sinPhi = Math.sin(phi);
            sum.re += complexPath[n].re * cosPhi + complexPath[n].im * sinPhi;
            sum.im += -complexPath[n].re * sinPhi + complexPath[n].im * cosPhi;
        }
        sum.re = sum.re / N;
        sum.im = sum.im / N;
        const freq = k;
        const amp = Math.sqrt(sum.re * sum.re + sum.im * sum.im);
        const phase = Math.atan2(sum.im, sum.re);
        fourierCoefficients.push({ re: sum.re, im: sum.im, freq, amp, phase });
    }

    // Sort coefficients by amplitude
    fourierCoefficients.sort((a, b) => b.amp - a.amp);
}

function visualizeApproximation() {
    let time = 0;
    const dt = (2 * Math.PI) / path.length;
    const drawingPoints = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Compute scaling factor
    let maxRadiusSum = 0;
    for (let i = 0; i < fourierCoefficients.length; i++) {
        maxRadiusSum += fourierCoefficients[i].amp;
    }
    const scale = Math.min(canvas.width, canvas.height) / (2 * maxRadiusSum * 1.1); // 1.1 to add some padding

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the epicycles
        let x = canvas.width / 2;
        let y = canvas.height / 2;

        for (let i = 0; i < fourierCoefficients.length; i++) {
            let prevX = x;
            let prevY = y;

            const freq = fourierCoefficients[i].freq;
            const radius = fourierCoefficients[i].amp * scale;
            const phase = fourierCoefficients[i].phase;

            x += radius * Math.cos(freq * time + phase);
            y += radius * Math.sin(freq * time + phase);

            // Draw circle
            ctx.beginPath();
            ctx.arc(prevX, prevY, radius, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.stroke();

            // Draw radius
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.stroke();
        }

        drawingPoints.unshift({ x, y });

        // Draw the drawing path
        ctx.beginPath();
        ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
        for (let i = 1; i < drawingPoints.length; i++) {
            ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
        }
        ctx.strokeStyle = '#ff0000';
        ctx.stroke();

        time += dt;

        if (time < 2 * Math.PI) {
            requestAnimationFrame(animate);
        } else {
            // Final drawing
            ctx.beginPath();
            ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
            for (let i = 1; i < drawingPoints.length; i++) {
                ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
            }
            ctx.strokeStyle = '#ff0000';
            ctx.stroke();

            // Generate and display Fourier equation
            generateFourierEquation(scale);
        }
    }

    animate();
}

/* commenting out equation generation
function generateFourierEquation(scale) {
    let equation = '\\begin{align*}\n';
    equation += 'x(t) &= ';
    let terms = [];
    const maxTermsPerLine = 3;
    let termsInLine = 0;

    for (let i = 0; i < fourierCoefficients.length; i++) {
        const coeff = fourierCoefficients[i];
        const amp = (coeff.amp * scale).toFixed(2);
        const freq = coeff.freq;
        const phase = coeff.phase.toFixed(2);
        let term = '';

        if (amp < 0.01) continue; // Skip negligible terms

        if (freq === 0) {
            term = `${amp}`;
        } else {
            term = `${amp} \\cos(${freq} t ${phase >= 0 ? '+' : '-'} ${Math.abs(phase).toFixed(2)})`;
        }

        terms.push(term);
        termsInLine++;

        // Add line break after certain number of terms
        if (termsInLine >= maxTermsPerLine) {
            equation += terms.join(' + ') + ' \\\\\n&\\quad + ';
            terms = [];
            termsInLine = 0;
        }
    }

    if (terms.length > 0) {
        equation += terms.join(' + ');
    } else {
        // Remove the last '+ ' if no terms are left
        equation = equation.replace(/ \+ $/, '');
    }

    equation += '\n\\end{align*}';

    document.getElementById('fourierEquation').innerHTML = '\\(' + equation + '\\)';
    MathJax.typeset(); // To typeset the equation
}
*/