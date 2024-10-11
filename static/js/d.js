document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('webgl-canvas');
    const gl = canvas.getContext('webgl');

    let maxScrollY = 0;
    let targetScrollY = 0;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        updateMaxScroll();
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    const vertexShaderSource = 
    `attribute vec4 a_position;
    attribute vec2 a_texcoord;
    varying vec2 v_texcoord;
    void main() {
        gl_Position = a_position;
        v_texcoord = a_texcoord;
    }`
    ;

const fragmentShaderSource = 
`precision mediump float;
 varying vec2 v_texcoord;
 uniform sampler2D u_texture;
 uniform float u_blurAmount;

 void main() {
     vec4 color = vec4(0.0);
     for (float x = -2.0; x <= 2.0; x += 1.0) {
         for (float y = -2.0; y <= 2.0; y += 1.0) {
             color += texture2D(u_texture, v_texcoord + vec2(x, y) * u_blurAmount);
         }
     }
     gl_FragColor = color / 25.0;
 }`;
    function compileShader(gl, source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
        const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program linking failed:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        return program;
    }

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texcoordLocation = gl.getAttribLocation(program, 'a_texcoord');
    const textureLocation = gl.getUniformLocation(program, 'u_texture');

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 0, 0,
         1, -1, 1, 0,
        -1,  1, 0, 1,
        -1,  1, 0, 1,
         1, -1, 1, 0,
         1,  1, 1, 1
    ]), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 4 * 4, 0);

    gl.enableVertexAttribArray(texcoordLocation);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 4 * 4, 2 * 4);

    function drawScene() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(drawScene);
    }

    drawScene()

    let scrollY = 0;
    const smoothness = 0.08;

    function smoothScroll() {
        scrollY += (targetScrollY - scrollY) * smoothness;
        document.querySelector('.scroll-content').style.transform = `translateY(${-Math.round(scrollY)}px)`;
        requestAnimationFrame(smoothScroll);
    }

    function handleWheel(event) {
        const scrollMultiplier = 0.5;
        targetScrollY += event.deltaY * scrollMultiplier;
        targetScrollY = Math.max(0, Math.min(targetScrollY, maxScrollY));
    }

    window.addEventListener('wheel', handleWheel);
    smoothScroll();

    let isDragging = false;
    let startY = 0;
    const dragSpeedMultiplier = 2.2; 
    
    function handleMouseDown(event) {
        isDragging = true;
        startY = event.clientY;
    }
    

    function handleMouseMove(event) {
        if (!isDragging) return;
    
        const deltaY = (event.clientY - startY) * dragSpeedMultiplier;
        startY = event.clientY;
    
        targetScrollY -= deltaY;
        targetScrollY = Math.max(0, Math.min(targetScrollY, maxScrollY));
    }
    
    function handleMouseUp() {
        isDragging = false;
    }
    
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);
    

    function handleKeyDown(event) {
        const scrollStep = 200;

        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            targetScrollY += scrollStep;
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            targetScrollY -= scrollStep;
        }
        targetScrollY = Math.max(0, Math.min(targetScrollY, maxScrollY));
    }

    window.addEventListener('keydown', handleKeyDown);

    function updateMaxScroll() {
        const scrollContent = document.querySelector('.scroll-content');
        if (scrollContent) {
            maxScrollY = Math.max(0, scrollContent.offsetHeight - window.innerHeight);
            targetScrollY = Math.min(targetScrollY, maxScrollY);
        } else {
            console.error('.scroll-content not found.');
        }
    }

    window.addEventListener('load', updateMaxScroll);
    window.addEventListener('resize', resizeCanvas);

    function applyParallax() {
        document.querySelectorAll('.img-canvas').forEach(canvas => {
            const imgContainer = canvas.parentElement;
            if (imgContainer.classList.contains('parallax')) {
                const speed = 0.35; // Adjust the parallax speed multiplier here
                const offsetY = (scrollY * -speed) % canvas.height; // Adjust parallax direction here

                const img = imgContainer.querySelector('img');
                if (img && img.complete) {
                    drawImageOnCanvas(canvas, img, offsetY);
                } else if (img) {
                    img.onload = () => {
                        drawImageOnCanvas(canvas, img, offsetY);
                    };
                }
            } else {
                // Ensure that other .img-canvas elements are correctly displayed
                const img = imgContainer.querySelector('img');
                if (img && img.complete) {
                    drawImageOnCanvas(canvas, img, 0);
                } else if (img) {
                    img.onload = () => {
                        drawImageOnCanvas(canvas, img, 0);
                    };
                }
            }
        });
    }

    function drawImageOnCanvas(canvas, img, offsetY = 0) {
        const ctx = canvas.getContext('2d');
        const containerWidth = canvas.parentElement.clientWidth;
        const containerHeight = canvas.parentElement.clientHeight;
        canvas.width = containerWidth;
        canvas.height = containerHeight;

        const imgAspectRatio = img.naturalWidth / img.naturalHeight;
        const canvasAspectRatio = containerWidth / containerHeight;

        let drawWidth, drawHeight, offsetX;

        if (imgAspectRatio > canvasAspectRatio) {
            drawWidth = containerHeight * imgAspectRatio;
            drawHeight = containerHeight;
            offsetX = (containerWidth - drawWidth) / 2;
        } else {
            drawWidth = containerWidth;
            drawHeight = containerWidth / imgAspectRatio;
            offsetX = 0;
        }

        const initialOffsetY = (containerHeight - drawHeight) / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, offsetX, initialOffsetY - offsetY, drawWidth, drawHeight);
    }

    



    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        applyParallax();
        requestAnimationFrame(render);
    }

    render();
});




function createsequence() {
    const animations = [];

    function addAnimation(element, props, delay = 0) {
        if (!element) return;

        const keyframes = [
            props.from,
            props.to || {}
        ];

        const options = {
            duration: props.duration || 1000,
            easing: props.ease || 'linear',
            fill: props.fill || 'forwards',
            delay
        };

        const animation = element.animate(keyframes, options);
        animation.pause();
        animations.push({ animation, delay, startTime: 0 });
    }

    function playAll() {
        animations.forEach(({ animation, delay }) => {
            // Only set the delay if the animation is not already playing
            if (animation.playState === 'paused') {
                setTimeout(() => {
                    animation.play();
                }, delay);
            }
        });
    }

    function pauseAll() {
        animations.forEach((animObj) => {
            if (animObj.animation.playState === 'running') {
                animObj.animation.pause();
            }
        });
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            pauseAll();
        } else {
            playAll();
        }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return {
        from(selector, props, stagger = 0, delay = 0) {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
                const elementDelay = delay + (index * stagger);
                addAnimation(element, {
                    from: props.from,
                    to: props.to,
                    duration: props.duration,
                    ease: props.ease,
                    fill: props.fill
                }, elementDelay);
            });
            return this;
        },
        playAll,
        pauseAll
    };
}

const sequence = createsequence();

sequence
    .from('.nana1 span', {
        from: { transform: 'translateY(100%)',},
        to: { transform: 'translateY(0)', opacity: 1 },
        duration: 3000,
        ease: 'cubic-bezier(0.19, 1, 0.22, 1)'
    }, 50, 0) 
    .from('.img-canvas-main', {
        from: { transform: 'scale(1.2)', opacity: 0 },
        to: { transform: 'scale(1)', opacity: 1 },
        duration: 3000,
        ease: 'cubic-bezier(0.19, 1, 0.22, 1)'
    }, 0);

sequence.playAll();



function createMotionView() {
    const animations = [];

    // Function to add animation to an element
    function addAnimation(element, props, delay = 0) {
        if (!element) return;

        const keyframes = [
            props.from,
            props.to || {}
        ];

        const options = {
            duration: props.duration || 1000,
            easing: props.ease || 'linear',
            fill: props.fill || 'forwards',
            delay
        };

        const animation = element.animate(keyframes, options);
        animation.pause(); // Start the animation paused
        element._animation = animation; // Store the animation object in the element
        element._hasAnimated = false; // Track if the animation has been triggered
        animations.push({ element, animation, delay });
    }

    // Function to handle when an element is in view
    function playAnimation(entry, observer) {
        const element = entry.target;
        const animation = element._animation;

        if (entry.isIntersecting) {
            if (animation.playState === 'paused') {
                animation.play();
                element._hasAnimated = true; // Mark that this element's animation has been triggered
                observer.unobserve(element); // Unobserve the element after playing the animation
            }
        }
    }

    // IntersectionObserver to monitor visibility of elements
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => playAnimation(entry, observer));
    }, {
        root: null,
        threshold: 0.00000001 // Trigger when at least 1% of the element is visible
    });

    // Function to handle visibility change (when the user switches tabs)
    function handleVisibilityChange() {
        if (document.hidden) {
            animations.forEach(({ element }) => {
                const animation = element._animation;
                // Pause only the running animations when the tab becomes hidden
                if (animation.playState === 'running') {
                    animation.pause();
                    element._wasRunning = true; // Mark that this element was running when the tab was hidden
                } else {
                    element._wasRunning = false;
                }
            });
        } else {
            animations.forEach(({ element }) => {
                const animation = element._animation;
                // Resume only the animations that were running and already triggered
                if (animation.playState === 'paused' && element._wasRunning && element._hasAnimated) {
                    animation.play();
                }
            });
        }
    }

    // Listen for when the tab becomes hidden or visible
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return {
        from(selector, props, stagger = 0, delay = 0) {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
                const elementDelay = delay + (index * stagger);
                addAnimation(element, props, elementDelay);
                observer.observe(element); // Observe each element
            });
            return this;
        }
    };
}

const motionView = createMotionView();

motionView
    .from('.mini-parallax .img-canvas', {
        from: { transform: 'scale(1.25)' },
        to: { transform: 'scale(1)' },
        duration: 4500,
        ease: 'cubic-bezier(0.19, 1, 0.22, 1)'
    }, 0);


    motionView
    .from('.div span', {
        from: { transform: 'translateY(90%)' },
        to: { transform: 'translateY(0%)' },
        duration: 3000,
        ease: 'cubic-bezier(0.19, 1, 0.22, 1)'
    },50, 0);

    motionView
    .from('.div2 span', {
        from: { transform: 'translateY(90%)' },
        to: { transform: 'translateY(0%)' },
        duration: 3000,
        ease: 'cubic-bezier(0.19, 1, 0.22, 1)'
    },50, 0);

    motionView
    .from('.feel-them p', {
        from: { transform: 'translateY(90%)' },
        to: { transform: 'translateY(0%)' },
        duration: 3000,
        ease: 'cubic-bezier(0.19, 1, 0.22, 1)'
    }, 0);
window.addEventListener('load', () => {
    // Trigger any animations that should start on page load (if required)
});


var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('webgl');

var d = document.implementation.createHTMLDocument();
d.body.appendChild(document.getElementById('all'));

rasterizeHTML.drawDocument(d, canvas).then(function(renderResult) {
  ctx.drawImage(renderResult.image, -8, -8);
 

  });
