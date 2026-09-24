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
    sending: 'جارٍ تجهيز رسالة الطلب…',
    success: 'تحلّ تطبيق البريد برسالة جاهزة. راجعها واضغط إرسال باش يوصل الطلب.',
    error: 'تعذّر إرسال الطلب دابا. المعلومات باقية فالاستمارة؛ عاود المحاولة من بعد.',
    rate: 'وصلت للحد المسموح ديال الطلبات اليوم. جرّب غداً أو تواصل عبر إنستغرام.',
    invalid: 'راجع المعلومات المطلوبة وحاول من جديد.'
  },
  en: {
    step1: 'STEP 1 OF 2', step2: 'STEP 2 OF 2',
    title1: 'CONTACT DETAILS', title2: 'GOAL & ROUTINE',
    sending: 'Preparing your application email…',
    success: 'Your email app opened with a ready message. Review it and tap send to deliver your application.',
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

form.addEventListener('submit', event => {
  event.preventDefault();
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

  const labels = {
    service: {one_to_one: 'كوتشينغ فردي 1:1', workout_plan: 'جدول تمارين فقط'},
    goal: {fat_loss: 'خفض الدهون', muscle: 'بناء العضلات', recomposition: 'تحسين التكوين الجسدي', routine: 'العودة للتمرين'},
    level: {beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم'},
    equipment: {gym: 'قاعة رياضية', home: 'الدار', both: 'القاعة والدار'},
    contact_method: {whatsapp: 'واتساب', email: 'البريد الإلكتروني'},
    start_timeline: {now: 'في أقرب وقت', two_weeks: 'خلال أسبوعين', month: 'خلال شهر'},
    training_constraints: {none: 'لا', discuss: 'نعم، تُناقش بشكل خاص'}
  };
  const pick = (group, value) => labels[group]?.[value] || value || '-';
  const subject = `طلب ${pick('service', payload.service)} — ${payload.name}`;
  const body = [
    'طلب جديد عبر موقع JAAFAR FIT', '',
    `الاسم: ${payload.name}`,
    `الخدمة: ${pick('service', payload.service)}`,
    `البريد: ${payload.email}`,
    `واتساب: ${payload.phone}`,
    `العمر: ${payload.age}`,
    `التواصل المفضل: ${pick('contact_method', payload.contact_method)}`,
    `الهدف: ${pick('goal', payload.goal)}`,
    `المستوى: ${pick('level', payload.level)}`,
    `الطول: ${payload.height_cm} cm`,
    `الوزن: ${payload.weight_kg} kg`,
    `أيام التدريب: ${payload.days}`,
    `مكان التدريب: ${pick('equipment', payload.equipment)}`,
    `موعد البداية: ${pick('start_timeline', payload.start_timeline)}`,
    `قيود التدريب: ${pick('training_constraints', payload.training_constraints)}`,
    `التحدي: ${payload.notes || '-'}`,
    '', `مرجع الطلب: ${payload.id}`
  ].join('\n');
  window.location.href = `mailto:jaafarbejtita@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  showFeedback('success');
  feedback.focus();
  pending = false;
  submitButton.disabled = false;
  form.removeAttribute('aria-busy');
});

translatePage();
