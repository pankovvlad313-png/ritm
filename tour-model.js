(function(root){
  function createPractice(Planner,today){
    const week=Planner.monday(today);
    let task={id:'ritm-guide-practice',title:'Прогулка',duration:30,frequency:3,mode:'weekly',days:[0,1,2,3,4,5,6],gap:1,priority:1,paused:false};
    let entries=[],issues=[],shuffled=false;
    return {
      get task(){return {...task,days:[...task.days]};},
      get entries(){return entries.map(e=>({...e}));},
      get issues(){return issues.map(i=>({...i}));},
      get week(){return week;},
      get shuffled(){return shuffled;},
      get completed(){return entries.filter(e=>e.done).length;},
      set(patch){task={...task,...patch,days:patch.days?[...patch.days]:task.days};entries=[];issues=[];shuffled=false;},
      generate(){const result=Planner.generate([task],{minutes:600,maxTasks:7},week,entries);entries=result.entries;issues=result.issues;return result;},
      pin(id){const e=entries.find(e=>e.id===id);if(e)e.pinned=!e.pinned;shuffled=false;},
      shuffle(){if(!entries.some(e=>e.pinned))return false;this.generate();shuffled=true;return true;},
      complete(id){const e=entries.find(e=>e.id===id);if(e)e.done=!e.done;}
    };
  }
  const api={createPractice};if(typeof module!=='undefined')module.exports=api;root.RitmTourModel=api;
})(typeof window==='undefined'?globalThis:window);
