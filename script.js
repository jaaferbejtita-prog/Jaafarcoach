const root = document.documentElement;
const languageButton = document.getElementById('language');
const form = document.getElementById('coaching-form');
const feedback = document.getElementById('form-message');
const submitButton = form.querySelector('button[type="submit"]');
const steps = [...form.querySelectorAll('.form-step')];
const stepLabel = document.getElementById('step-label');
const stepTitle = document.getElementById('step-title');
const progress = form.querySelector('.progress i');

let currentStep = 1;
let pending = false;
let feedbackKey = '';
let applicationId = crypto.randomUUID();

const words = {
  ar: {
    step1: 'الخطوة 1 من 2', step2: 'الخطوة 2 من 2',
    title1: 'معلومات التواصل', title2: 'الهدف والروتين',
    sending: 'جارٍ إرسال الطلب…',
    success: 'تسجّل طلبك بنجاح. غادي نتواصل معك عبر الطريقة اللي اخترتي باش نناقشو الخطوة الجاية.',
    error: 'تعذّر إرسال الطلب دابا. المعلومات باقية فالاستمارة؛ عاود المحاولة من بعد.',
    rate: 'وصلت للحد المسموح ديال الطلبات اليوم. جرّب غداً أو تواصل عبر إنستغرام.',
    invalid: 'راجع المعلومات المطلوبة وحاول من جديد.'
  },
  en: {
    step1: 'STEP 1 OF 2', step2: 'STEP 2 OF 2',
    title1: 'CONTACT DETAILS', title2: 'GOAL & ROUTINE',
    sending: 'Sending your application…',
    success: 'Your application has been saved. I’ll contact you through your preferred method to discuss the next step.',
    error: 'Your application could not be sent right now. Your answers are still here; please retry later.',
    rate: 'You have reached today’s application limit. Try tomorrow or contact me on Instagram.',
    invalid: 'Please check the required information and try again.'
  }
};

function lang() { return root.lang === 'en' ? 'en' : 'ar'; }

function translatePage() {
  const active = lang();
  document.querySelectorAll('[data-ar][data-en]').forEach(element => {
    element.innerHTML = element.dataset[active];
  });
  document.querySelectorAll('[data-alt-ar][data-alt-en]').forEach(element => {
    element.alt = element.getAttribute(`data-alt-${active}`);
  });
  languageButton.textContent = active === 'ar' ? 'EN' : 'ع';
  languageButton.setAttribute('aria-label', active === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
  updateStep(false);
  if (feedbackKey) showFeedback(feedbackKey);
}

function updateStep(focus = true) {
  steps.forEach(step => step.classList.toggle('active', Number(step.dataset.step) === currentStep));
  stepLabel.textContent = words[lang()][`step${currentStep}`];
  stepTitle.textContent = words[lang()][`title${currentStep}`];
  progress.style.width = currentStep === 1 ? '50%' : '100%';
  if (focus) {
    stepTitle.setAttribute('tabindex', '-1');
    stepTitle.focus({preventScroll: true});
    form.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
  }
}

function validateStep(stepNumber) {
  const fields = steps[stepNumber - 1].querySelectorAll('input,select,textarea');
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      field.focus();
      return false;
    }
  }
  return true;
}

function showFeedback(key) {
  feedbackKey = key;
  feedback.textContent = words[lang()][key] || '';
  feedback.className = key === 'success' ? 'success' : key === 'sending' ? '' : 'error';
}

languageButton.addEventListener('click', () => {
  const next = lang() === 'ar' ? 'en' : 'ar';
  root.lang = next;
  root.dir = next === 'ar' ? 'rtl' : 'ltr';
  translatePage();
});

form.querySelector('.next').addEventListener('click', () => {
  if (!validateStep(1)) return;
  currentStep = 2;
  updateStep();
});

form.querySelector('.back').addEventListener('click', () => {
  currentStep = 1;
  updateStep();
});

document.querySelectorAll('[data-service]').forEach(link => {
  link.addEventListener('click', () => {
    form.elements.service.value = link.dataset.service;
    currentStep = 1;
    updateStep(false);
  });
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (currentStep === 1) {
    if (validateStep(1)) { currentStep = 2; updateStep(); }
    return;
  }
  if (pending || !validateStep(2)) return;

  pending = true;
  submitButton.disabled = true;
  form.setAttribute('aria-busy', 'true');
  showFeedback('sending');

  const fields = new FormData(form);
  const payload = {
    id: applicationId,
    service: fields.get('service'),
    name: fields.get('name'),
    email: fields.get('email'),
    phone: fields.get('phone'),
    age: Number(fields.get('age')),
    contact_method: fields.get('contact_method'),
    goal: fields.get('goal'),
    level: fields.get('level'),
    height_cm: Number(fields.get('height_cm')),
    weight_kg: Number(fields.get('weight_kg')),
    days: Number(fields.get('days')),
    equipment: fields.get('equipment'),
    start_timeline: fields.get('start_timeline'),
    training_constraints: fields.get('training_constraints'),
    notes: fields.get('notes'),
    website: fields.get('website'),
    consent: fields.has('consent'),
    adult: fields.has('adult')
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch('https://jaafar-fit-coaching.jaafarbejtita.chatgpt.site/api/apply', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
      credentials: 'same-origin',
      signal: controller.signal
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) {
      showFeedback(response.status === 429 ? 'rate' : response.status === 400 ? 'invalid' : 'error');
    } else {
      form.reset();
      applicationId = crypto.randomUUID();
      currentStep = 1;
      updateStep(false);
      showFeedback('success');
      feedback.focus();
    }
  } catch {
    showFeedback('error');
  } finally {
    clearTimeout(timeout);
    pending = false;
    submitButton.disabled = false;
    form.removeAttribute('aria-busy');
  }
});

translatePage();
