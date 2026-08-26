/**
 * MAHARAH ONE - SAUDI FINANCING LANDING PAGE LOGIC
 * Frontend-only Qualification Flow & WhatsApp Pre-filled Message Generator
 */

// 1. WhatsApp Configuration Constant
const WHATSAPP_NUMBER = "966553637029"; // Standard Saudi international format without +

// 2. Application State Object
const applicationData = {
    isSaudi: "",              // "نعم" or "لا"
    employmentType: "",      // "حكومي" or "قطاع خاص"
    companyApproved: null,    // "نعم" or "لا" (or null if government)
    salary: "",               // "أقل من 7,000 ريال" or "7,000 ريال أو أكثر"
    hasProperty: null,       // "يوجد" or "لا يوجد"
    earlySettlement: "",      // SAR amount string
    totalCommitments: "",     // SAR amount string
    interest: "",             // "العقار", "السيولة", "السداد", "جميع ما سبق"
    propertyType: "",         // "سكن" or "استثمار" (if applicable)
    violations: "",           // SAR amount string
    fullName: "",
    phone: "",
    city: "",
    selectedServices: []      // Matched services array
};

// Wizard State Trackers
let currentStepNumber = 1;
const stepSequence = []; // Dynamic sequence of active step numbers (e.g., [1, 2, 4, 5, 6, 7, 8, 9])

// 3. DOM Elements Setup
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initApplicationFlow();
    initContactForm();
    initNumericInputConversion();
});

/* ==========================================================================
   NAVIGATION & MOBILE DRAWER
   ========================================================================== */
function initNavigation() {
    const mobileToggle = document.getElementById("mobileToggle");
    const mobileDrawer = document.getElementById("mobileDrawer");
    const mobileLinks = document.querySelectorAll(".mobile-link, .mobile-cta");
    const navLinks = document.querySelectorAll(".nav-link");

    if (mobileToggle && mobileDrawer) {
        mobileToggle.addEventListener("click", () => {
            const isVisible = mobileDrawer.style.display === "block";
            mobileDrawer.style.display = isVisible ? "none" : "block";
        });

        mobileLinks.forEach(link => {
            link.addEventListener("click", () => {
                mobileDrawer.style.display = "none";
            });
        });
    }

    // Active nav link highlight on scroll
    window.addEventListener("scroll", () => {
        let current = "";
        const sections = document.querySelectorAll("section");

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute("id");
            }
        });

        navLinks.forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href") === `#${current}`) {
                link.classList.add("active");
            }
        });
    });
}

/* ==========================================================================
   APPLICATION & QUALIFICATION FLOW
   ========================================================================== */
function initApplicationFlow() {
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const restartBtn = document.getElementById("restartBtn");

    // Option Buttons Click Listeners
    const optionButtons = document.querySelectorAll(".btn-option");
    optionButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const targetBtn = e.currentTarget;
            const field = targetBtn.getAttribute("data-field");
            const value = targetBtn.getAttribute("data-value");

            handleOptionSelection(targetBtn, field, value);
        });
    });

    // Control Buttons
    if (prevBtn) {
        prevBtn.addEventListener("click", goToPreviousStep);
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", handleNextStep);
    }

    if (restartBtn) {
        restartBtn.addEventListener("click", resetApplication);
    }

    // Recalculate dynamic sequence and show step 1
    recalculateStepSequence();
    updateStepVisibility();
}

/**
 * Recalculates the active steps sequence based on choices
 */
function recalculateStepSequence() {
    stepSequence.length = 0;

    // Step 1: Nationality (Always active)
    stepSequence.push(1);

    // Step 2: Employment Type
    stepSequence.push(2);

    // Step 3: Company Approved (ONLY for Private sector)
    if (applicationData.employmentType === "قطاع خاص") {
        stepSequence.push(3);
    }

    // Step 4: Salary
    stepSequence.push(4);

    // Step 5: Property
    stepSequence.push(5);

    // Step 6: Commitments
    stepSequence.push(6);

    // Step 7: Main Interest
    stepSequence.push(7);

    // Step 8: Property Type (ONLY if interest includes Real Estate)
    if (applicationData.interest === "العقار" || applicationData.interest === "جميع ما سبق") {
        stepSequence.push(8);
    }

    // Step 9: Violations
    stepSequence.push(9);
}

/**
 * Handles selection of card option buttons
 */
function handleOptionSelection(button, field, value) {
    // Clear validation errors
    document.querySelectorAll(".error-msg").forEach(el => el.classList.remove("visible"));

    // Highlight active button in step
    const parentStep = button.closest(".question-step");
    if (parentStep) {
        const stepOptions = parentStep.querySelectorAll(".btn-option");
        stepOptions.forEach(opt => opt.classList.remove("selected"));
        button.classList.add("selected");
    }

    // Store value in state
    applicationData[field] = value;

    // Handle special inline fields (e.g. Property early settlement)
    if (field === "hasProperty") {
        const earlySettlementGroup = document.getElementById("earlySettlementGroup");
        if (value === "يوجد") {
            earlySettlementGroup.classList.remove("hidden");
        } else {
            earlySettlementGroup.classList.add("hidden");
            applicationData.earlySettlement = "";
            document.getElementById("earlySettlementInput").value = "";
        }
    }

    // Recalculate pathway
    recalculateStepSequence();

    // Check Immediate Qualification Rejection Conditions!
    if (checkRejectionConditions()) {
        showRejectionScreen();
        return;
    }

    // Auto-advance for simple choice steps if not an input step
    if (currentStepNumber !== 5 && currentStepNumber !== 6 && currentStepNumber !== 9) {
        setTimeout(() => {
            advanceToNextStep();
        }, 220);
    }
}

/**
 * Checks the explicit rejection conditions:
 * Condition 0: غير سعودي (لا)
 * Condition 1: قطاع خاص + لا (شركة غير معتمدة)
 * Condition 2: أقل من 7,000 ريال (الراتب)
 */
function checkRejectionConditions() {
    // Condition 0: Nationality is NOT Saudi
    if (applicationData.isSaudi === "لا") {
        return true;
    }

    // Condition 1: Private sector + Company Not Approved
    if (applicationData.employmentType === "قطاع خاص" && applicationData.companyApproved === "لا") {
        return true;
    }

    // Condition 2: Salary < 7,000 SAR
    if (applicationData.salary === "أقل من 7,000 ريال") {
        return true;
    }

    return false;
}

/**
 * Advances to the next logical step or triggers qualification result
 */
function handleNextStep() {
    // Hide all step error messages initially
    document.querySelectorAll(".error-msg").forEach(el => el.classList.remove("visible"));
    document.querySelectorAll(".form-input").forEach(el => el.classList.remove("invalid"));

    // Validation per step
    if (currentStepNumber === 1 && !applicationData.isSaudi) {
        return;
    }

    if (currentStepNumber === 2 && !applicationData.employmentType) {
        return;
    }

    if (currentStepNumber === 3 && !applicationData.companyApproved) {
        return;
    }

    if (currentStepNumber === 4 && !applicationData.salary) {
        return;
    }

    if (currentStepNumber === 5) {
        if (!applicationData.hasProperty) {
            const err = document.getElementById("step5Error");
            if (err) err.classList.add("visible");
            return;
        }

        if (applicationData.hasProperty === "يوجد") {
            const input = document.getElementById("earlySettlementInput");
            const val = input.value.trim();
            if (!val) {
                input.classList.add("invalid");
                input.focus();
                const err = document.getElementById("earlySettlementError");
                if (err) err.classList.add("visible");
                return;
            }
            applicationData.earlySettlement = val;
        }
    }

    if (currentStepNumber === 6) {
        const input = document.getElementById("commitmentsInput");
        const val = input.value.trim();
        if (!val) {
            input.classList.add("invalid");
            input.focus();
            const err = document.getElementById("step6Error");
            if (err) err.classList.add("visible");
            return;
        }
        applicationData.totalCommitments = val;
    }

    if (currentStepNumber === 7 && !applicationData.interest) {
        const err = document.getElementById("step7Error");
        if (err) err.classList.add("visible");
        return;
    }

    if (currentStepNumber === 8 && !applicationData.propertyType) {
        const err = document.getElementById("step8Error");
        if (err) err.classList.add("visible");
        return;
    }

    if (currentStepNumber === 9) {
        const input = document.getElementById("violationsInput");
        const val = input.value.trim();
        if (val === "") {
            input.classList.add("invalid");
            input.focus();
            const err = document.getElementById("step9Error");
            if (err) err.classList.add("visible");
            return;
        }
        applicationData.violations = val;
    }

    // Check Rejection before proceeding
    if (checkRejectionConditions()) {
        showRejectionScreen();
        return;
    }

    advanceToNextStep();
}

function advanceToNextStep() {
    const currentIndex = stepSequence.indexOf(currentStepNumber);
    if (currentIndex < stepSequence.length - 1) {
        currentStepNumber = stepSequence[currentIndex + 1];
        updateStepVisibility();
    } else {
        // Questionnaire Completed -> Show Qualified Result
        showQualifiedResultScreen();
    }
}

function goToPreviousStep() {
    const currentIndex = stepSequence.indexOf(currentStepNumber);
    if (currentIndex > 0) {
        currentStepNumber = stepSequence[currentIndex - 1];
        updateStepVisibility();
    }
}

/**
 * Updates UI progress bar, control buttons, and step visibility
 */
function updateStepVisibility() {
    // Hide all steps
    const allSteps = document.querySelectorAll(".question-step");
    allSteps.forEach(step => step.classList.remove("active"));

    // Show current active step
    const currentStepEl = document.getElementById(`step-${currentStepNumber}`);
    if (currentStepEl) {
        currentStepEl.classList.add("active");
    }

    // Update Progress Bar
    const currentIndex = stepSequence.indexOf(currentStepNumber);
    const totalSteps = stepSequence.length;
    const progressPercent = Math.round(((currentIndex + 1) / totalSteps) * 100);

    const progressStepText = document.getElementById("progressStepText");
    const progressPercentText = document.getElementById("progressPercentText");
    const progressBarFill = document.getElementById("progressBarFill");

    if (progressStepText) progressStepText.textContent = `الخطوة ${currentIndex + 1} من ${totalSteps}`;
    if (progressPercentText) progressPercentText.textContent = `${progressPercent}%`;
    if (progressBarFill) progressBarFill.style.width = `${progressPercent}%`;

    // Update Controls (Previous button visibility)
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const appControls = document.getElementById("appControls");

    if (appControls) appControls.style.display = "flex";

    if (prevBtn) {
        if (currentIndex === 0) {
            prevBtn.style.visibility = "hidden";
        } else {
            prevBtn.style.visibility = "visible";
        }
    }

    if (nextBtn) {
        // On input steps, show next button clearly
        if (currentStepNumber === 4 || currentStepNumber === 5 || currentStepNumber === 8) {
            nextBtn.textContent = "التالي";
        } else {
            nextBtn.textContent = "متابعة";
        }
    }
}

/* ==========================================================================
   SERVICE MATCHING & RESULTS
   ========================================================================== */

function showQualifiedResultScreen() {
    // Match appropriate services
    matchServices();

    // Hide questionnaire header, steps, and controls
    document.getElementById("appHeader").classList.add("hidden");
    document.querySelectorAll(".question-step").forEach(s => s.classList.remove("active"));
    document.getElementById("appControls").style.display = "none";

    // Render Matched Service Cards
    renderMatchedServices();

    // Generate WhatsApp message and launch WhatsApp directly
    generateWhatsAppMessage();

    // Show Qualified Result Container
    document.getElementById("qualifiedResult").classList.remove("hidden");
}

function matchServices() {
    const services = [];
    const interest = applicationData.interest;
    const propertyType = applicationData.propertyType;

    const houseIcon = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5z"/><path d="M9 21V12h6v9"/></svg>`;
    const buildingIcon = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"/><path d="M1 21h22"/><path d="M9 7h2"/><path d="M9 11h2"/><path d="M9 15h2"/><path d="M13 7h2"/><path d="M13 11h2"/><path d="M13 15h2"/></svg>`;
    const cashIcon = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>`;
    const shieldIcon = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`;

    if (interest === "العقار") {
        if (propertyType === "سكن") {
            services.push({
                title: "تمويل فيلا دوبلكس للسكن",
                desc: "حلول تمويل عقاري ميسرة لشراء أو بناء فيلا سكنية عائلية.",
                icon: houseIcon
            });
        } else if (propertyType === "استثمار") {
            services.push({
                title: "تمويل فيلا دوبلكس للاستثمار",
                desc: "خيارات استثمارية عقارية مخصصة وإمكانية الإدارة والتأجير.",
                icon: buildingIcon
            });
        } else {
            services.push({
                title: "تمويل فيلا دوبلكس للسكن والاستثمار",
                desc: "حلول تمويل عقاري مرنة تناسب تطلعاتك.",
                icon: houseIcon
            });
        }
    } else if (interest === "السيولة") {
        services.push({
            title: "طلب سيولة نقدية تصل إلى 60% من قيمة التمويل",
            desc: "إمكانية الحصول على سيولة كاش مباشرة لتغطية كافة التزاماتك.",
            icon: cashIcon
        });
    } else if (interest === "السداد") {
        services.push({
            title: "سداد الالتزامات أو المتعثرات بدون فوائد",
            desc: "توحيد مالي شامل وسداد القروض والمتعثرات وإيقاف الخدمات.",
            icon: shieldIcon
        });
    } else if (interest === "جميع ما سبق") {
        if (propertyType === "سكن") {
            services.push({
                title: "تمويل فيلا دوبلكس للسكن",
                desc: "خيارات السكن العقاري الميسرة.",
                icon: houseIcon
            });
        } else {
            services.push({
                title: "تمويل فيلا دوبلكس للاستثمار",
                desc: "خيارات تمويل الاستثمار العقاري.",
                icon: buildingIcon
            });
        }

        services.push({
            title: "طلب سيولة نقدية تصل إلى 60% من قيمة التمويل",
            desc: "توفير سيولة نقدية فورية بحسابك.",
            icon: cashIcon
        });

        services.push({
            title: "سداد الالتزامات أو المتعثرات بدون فوائد",
            desc: "إعادة هيكلة وحلول المتعثرات المالية.",
            icon: shieldIcon
        });
    }

    applicationData.selectedServices = services.map(s => s.title);
    return services;
}

function renderMatchedServices() {
    const grid = document.getElementById("matchedServicesGrid");
    grid.innerHTML = "";

    const services = matchServices();

    services.forEach(srv => {
        const card = document.createElement("div");
        card.className = "matched-service-card";
        card.innerHTML = `
            <div class="matched-card-icon">${srv.icon}</div>
            <div class="matched-card-text">
                <h4>${srv.title}</h4>
                <p>${srv.desc}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function showRejectionScreen() {
    // Hide progress, steps, and control buttons
    document.getElementById("appHeader").classList.add("hidden");
    document.querySelectorAll(".question-step").forEach(s => s.classList.remove("active"));
    document.getElementById("appControls").style.display = "none";
    document.getElementById("qualifiedResult").classList.add("hidden");

    // Show Rejection Card
    document.getElementById("rejectionResult").classList.remove("hidden");
}

function resetApplication() {
    // Reset State
    applicationData.isSaudi = "";
    applicationData.employmentType = "";
    applicationData.companyApproved = null;
    applicationData.salary = "";
    applicationData.hasProperty = null;
    applicationData.earlySettlement = "";
    applicationData.totalCommitments = "";
    applicationData.interest = "";
    applicationData.propertyType = "";
    applicationData.violations = "";
    applicationData.fullName = "";
    applicationData.phone = "";
    applicationData.city = "";
    applicationData.selectedServices = [];

    currentStepNumber = 1;

    // Clear form inputs & selections
    document.querySelectorAll(".btn-option").forEach(btn => btn.classList.remove("selected"));
    document.getElementById("earlySettlementInput").value = "";
    document.getElementById("earlySettlementGroup").classList.add("hidden");
    document.getElementById("commitmentsInput").value = "";
    document.getElementById("violationsInput").value = "0";

    document.getElementById("contactForm").reset();
    document.getElementById("whatsappFinalBox").classList.add("hidden");
    document.querySelector(".contact-form-box").classList.remove("hidden");

    // Hide results
    document.getElementById("rejectionResult").classList.add("hidden");
    document.getElementById("qualifiedResult").classList.add("hidden");

    // Show Header & Controls
    document.getElementById("appHeader").classList.remove("hidden");

    // Recalculate sequence and reset step 1
    recalculateStepSequence();
    updateStepVisibility();

    // Scroll smoothly to application top
    const appCard = document.getElementById("application");
    if (appCard) {
        appCard.scrollIntoView({ behavior: "smooth" });
    }
}

/* ==========================================================================
   CONTACT FORM & SAUDI PHONE VALIDATION & WHATSAPP INTEGRATION
   ========================================================================== */

function initContactForm() {
    // Contact form removed - direct flow to WhatsApp
}

function generateWhatsAppMessage() {
    // Format text from questionnaire choices - Clean text without symbols/emojis
    const lines = [];
    lines.push("السلام عليكم ورحمة الله وبركاته");
    lines.push("طلب تمويل جديد - مهارة وَن للحلول التمويلية");
    lines.push("");
    const nationalityVal = (applicationData.isSaudi === "نعم" || applicationData.isSaudi === "سعودي") ? "سعودي" : (applicationData.isSaudi || "سعودي");
    lines.push(`الجنسية: ${nationalityVal}`);
    lines.push(`نوع الوظيفة: ${applicationData.employmentType || "غير محدد"}`);

    if (applicationData.companyApproved) {
        lines.push(`اعتماد الشركة لدى البنك: ${applicationData.companyApproved}`);
    }

    lines.push(`الراتب الصافي: ${applicationData.salary || "غير محدد"}`);
    lines.push(`العقار: ${applicationData.hasProperty || "لا يوجد"}`);

    if (applicationData.earlySettlement) {
        lines.push(`مبلغ السداد المبكر: ${applicationData.earlySettlement} ريال`);
    }

    lines.push(`مجموع الالتزامات: ${applicationData.totalCommitments ? applicationData.totalCommitments + " ريال" : "0 ريال"}`);
    lines.push(`الاهتمام الرئيسي: ${applicationData.interest || "غير محدد"}`);

    if (applicationData.propertyType) {
        lines.push(`غرض العقار: ${applicationData.propertyType}`);
    }

    lines.push(`مجموع المخالفات: ${applicationData.violations ? applicationData.violations + " ريال" : "0 ريال"}`);
    lines.push("");
    lines.push(`الخدمة المطلوبة: ${applicationData.selectedServices.join(" - ") || "تمويل عقاري وسيولة نقدية"}`);
    lines.push("");
    lines.push("أرجو التواصل معي لتزويدي بتفاصيل التمويل المتاح والإجراءات.");

    const messageLines = lines.join("\n");

    // Render Preview
    const previewBox = document.getElementById("summaryPreviewBox");
    if (previewBox) {
        previewBox.textContent = messageLines;
    }

    // Create WhatsApp URL
    const encodedMessage = encodeURIComponent(messageLines);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

    const whatsappBtn = document.getElementById("whatsappBtn");
    if (whatsappBtn) {
        whatsappBtn.setAttribute("href", whatsappUrl);
        whatsappBtn.onclick = function(e) {
            // Direct navigation ensures 100% compatibility with iPhone Safari & Android
            window.location.href = whatsappUrl;
        };
    }
}

/**
 * Real-time conversion helper: Accepts BOTH Arabic (٠١٢٣٤٥٦٧٨٩) and English (0123456789) numerals.
 * Automatically converts Eastern Arabic digits to standard digits in real-time.
 */
function initNumericInputConversion() {
    const numericInputs = document.querySelectorAll(".numeric-input");
    numericInputs.forEach(input => {
        input.addEventListener("input", (e) => {
            let val = e.target.value;
            if (!val) return;

            // Convert Eastern Arabic numbers (٠-٩) to (0-9)
            const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
            for (let i = 0; i < 10; i++) {
                val = val.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
            }

            // Strip out non-numeric characters
            val = val.replace(/[^\d]/g, '');

            e.target.value = val;
        });
    });
}
