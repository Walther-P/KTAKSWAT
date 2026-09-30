(() => {
  const core=window.__KTAK35_CORE,markers=window.__KTAK6_MARKERS,space=window.__KTAK6;
  const root=document.getElementById('boardTacticalList');if(!root||!markers||!core)return;
  const section=document.createElement('details');section.className='tacticalAccordion g6-board-groups';section.open=true;
  const title=document.createElement('summary');title.textContent='目前編組';
  const list=document.createElement('div');list.className='tacticalAccordionBody';section.append(title,list);
  const personnel=[...root.querySelectorAll('.tacticalAccordion')].find(x=>x.querySelector('summary')?.textContent==='人員／隊伍');
  (personnel?.querySelector('.tacticalAccordionBody')||root).prepend(section);
  let previous='';
  function refresh(){
    const groups=(core.roomUuid?window.__KTAK35_V352?.getGroups?.()||[]:[]).slice().sort((a,b)=>String(a.code).localeCompare(String(b.code)));
    const signature=JSON.stringify([core.roomUuid,groups.map(g=>[g.id,g.code,g.type,g.color])]);
    if(signature===previous)return;previous=signature;list.replaceChildren();
    if(!groups.length){const empty=document.createElement('p');empty.className='g6-empty-groups';empty.textContent='尚未建立編組。可在「任務」編組設定後選用。';list.append(empty);return}
    for(const g of groups){
      const color=/^#[0-9a-f]{6}$/i.test(g.color||'')?g.color:'#45aff2',label=`${g.code||''} ${g.type||'編組'}`.trim();
      const b=document.createElement('button');b.type='button';b.className='tacticalPickBtn g6-board-group';b.dataset.groupId=g.id;b.style.setProperty('--team-color',color);
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 96 50');svg.setAttribute('aria-hidden','true');
      const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M4 5H66L92 25 66 45H4Z');path.setAttribute('fill',color);path.setAttribute('stroke','#fff');path.setAttribute('stroke-width','3');svg.append(path);
      const text=document.createElement('span');text.textContent=label;b.append(svg,text);
      b.onclick=()=>{
        // Resolve at click time so renamed/deleted groups never leave a stale choice.
        const current=window.__KTAK35_V352?.getGroups?.().find(x=>x.id===g.id);
        if(!current){refresh();return}
        const custom=document.getElementById('boardTacticalCustomLabel').value.trim();
        if(markers.chooseBoard(`v355team:${current.id}`,custom||`${current.code} ${current.type||'編組'}`,current.color))space.closePanel();
      };
      list.append(b);
    }
  }
  document.addEventListener('g6:canvas-tick',refresh);refresh();
})();
