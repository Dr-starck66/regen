(function(){
  function enhanceToc(){
    var toc=document.querySelector('.toc');
    if(!toc || window.innerWidth>800 || toc.classList.contains('is-collapsible')) return;
    toc.classList.add('is-collapsible','collapsed');
    var b=document.createElement('button');
    b.type='button';
    b.className='toc-toggle';
    b.setAttribute('aria-expanded','false');
    b.textContent='عرض الفهرس كاملاً';
    b.addEventListener('click',function(){
      var collapsed=toc.classList.toggle('collapsed');
      b.setAttribute('aria-expanded',String(!collapsed));
      b.textContent=collapsed?'عرض الفهرس كاملاً':'إخفاء جزء من الفهرس';
    });
    toc.appendChild(b);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhanceToc); else enhanceToc();
})();

(function(){
 var skip=/^\/(privacy|terms|about|editorial-policy|methodology|corrections|advertising-disclosure)(\/|$)/;
 function market(){var p=location.pathname;if(p.indexOf('/gcc/uae/')===0)return{country:'AE',label:'طلب خدمة أعمال'};if(p.indexOf('/gcc/qatar/')===0)return{country:'QA',label:'طلب خدمة أعمال'};if(p.indexOf('/gcc/oman/')===0)return{country:'OM',label:'طلب خدمة أعمال'};return{country:'SA',label:'طلب مطابقة'}}
 function send(form,msg){var fd=new FormData(form),o={};fd.forEach(function(v,k){o[k]=v});if(!o.country)o.country=market().country;o.page=location.pathname;o.referrer=document.referrer||'';msg.hidden=false;msg.className='trust';msg.textContent='جارٍ إرسال الطلب…';fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)}).then(async r=>{var j=await r.json().catch(()=>({}));if(!r.ok)throw Error();return j}).then(j=>{msg.textContent='تم استلام طلبك. الرقم المرجعي: '+j.id;form.reset()}).catch(()=>{msg.className='notice';msg.textContent='تعذر الإرسال الآن. حاول مرة أخرى بعد قليل.'})}
 function inline(){var f=document.getElementById('leadForm');if(!f||f.dataset.bound)return;f.dataset.bound='1';var m=document.getElementById('formMsg');f.addEventListener('submit',e=>{e.preventDefault();send(f,m)})}
 function modal(){if(skip.test(location.pathname)||document.querySelector('.lead-fab'))return;var mk=market(),b=document.createElement('button');b.type='button';b.className='lead-fab';b.textContent=mk.label;var w=document.createElement('div');w.className='lead-modal';w.hidden=true;w.innerHTML='<div class="lead-dialog" role="dialog" aria-modal="true"><button class="lead-close" type="button">×</button><h2>'+mk.label+'</h2><p class="small">'+(mk.country==='SA'?'أرسل بيانات أولية فقط دون مستندات حساسة.':'الطلب لخدمات الأعمال أو المعلومات العامة، وليس إحالة قانونية بالعمولة.')+'</p><form class="form"><input type="hidden" name="country" value="'+mk.country+'"><label>الاسم الأول<input name="first_name" maxlength="80" required></label><label>المدينة<input name="city" maxlength="80" required></label><label>الموضوع<select name="topic">'+(mk.country==='SA'?'<option value="compensation">تعويض</option><option value="labor">عمل</option><option value="corporate">شركات وعقود</option><option value="real-estate">عقار</option><option value="debt">تحصيل دين</option>':'<option value="business-services">خدمات أعمال</option><option value="company-formation">تأسيس شركة</option><option value="accounting">محاسبة ورواتب</option><option value="translation">ترجمة ووثائق</option><option value="insurance">تأمين أعمال</option>')+'</select></label><label>وسيلة التواصل<input name="contact" maxlength="160" required></label><label class="check"><input type="checkbox" name="consent" value="yes" required> أوافق على معالجة البيانات للرد على طلبي.</label><input class="hp" name="website" tabindex="-1" autocomplete="off"><button class="btn" type="submit">إرسال</button></form><p class="lead-msg trust" hidden></p></div>';document.body.append(b,w);var f=w.querySelector('form'),m=w.querySelector('.lead-msg');b.onclick=()=>{w.hidden=false;document.body.classList.add('modal-open')};w.querySelector('.lead-close').onclick=()=>{w.hidden=true;document.body.classList.remove('modal-open')};w.onclick=e=>{if(e.target===w){w.hidden=true;document.body.classList.remove('modal-open')}};f.onsubmit=e=>{e.preventDefault();send(f,m)}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{inline();modal()});else{inline();modal()}
})();