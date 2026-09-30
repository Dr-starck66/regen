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