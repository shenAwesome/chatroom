
function addScroll(div){
	if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		//do nothing on mobile
		div.style.overflow = 'auto';
		alert('a');
		return;
	}
	div.style.overflow = 'hidden';
	function createDiv(name,parent){
		var div = document.createElement('div');
		div.className = name;
		parent.appendChild(div); 
		return div;
	}
	function on(ele,event,handler){
		if (!handler){
			handler = event;
			event = 'click';
		}
		ele.addEventListener(event,handler);
	}
	var scrollbar = createDiv('scrollbar',div);
	div.insertBefore(scrollbar,div.firstChild);
	var knob = createDiv('knob',scrollbar); 
	var space = null;
	div.scrollTop=0; 
	
	function update(){ 
		scrollbar.style.display = 'none'; 
		scrollbar.style.display = (div.scrollHeight - div.clientHeight)>0?'block':'none';
		var step =  div.scrollTop/(div.scrollHeight - div.clientHeight); 
		var rect = scrollbar.getBoundingClientRect();  
		var knobHeight = rect.height * div.clientHeight/div.scrollHeight;  
		space = rect.height-knobHeight;
		knob.style.top = parseInt((rect.height-knobHeight)*step)+'px'; 
		knob.style.height = parseInt(knobHeight+1) + 'px';   
	}
	on(div,'scroll',update);
	on(window,'resize',update);
	setTimeout(update,100);
	
	var drag = null;
	on(knob,'mousedown',function(evt){
		drag =  {
			step:div.scrollTop/(div.scrollHeight - div.clientHeight),
			mouse:evt.clientY
		}
		evt.stopPropagation();
		evt.preventDefault();
	});
	on(knob,'click',function(evt){
		evt.stopPropagation();
		evt.preventDefault();
	});
	on(window,'mouseup',function(){
		drag =  null;
	});
	on(window,'wheel',function(evt){
		var step =  div.scrollTop/(div.scrollHeight - div.clientHeight);  
		if (evt.deltaY>0){
			setStep(step+0.1);
		}else{
			setStep(step-0.1);
		}
	});
	on(window,'mousemove',function(evt){
		if (drag){
			var offset = (evt.clientY - drag.mouse)/space; 
			var step = drag.step + offset; 
			setStep(step); 
			evt.stopPropagation();
			evt.preventDefault();
		}
	});
	
	function setStep(step){ 
		if (step>1) step = 1; 
		if (step<0) step=0; 
		var top = parseInt((div.scrollHeight - div.clientHeight)*step);  
		if (top<0) top=0;
		scrollbar.style.top = (top) +'px'; 
		div.scrollTop = top;
	}
	
	on(scrollbar,function(evt){
		var rect = scrollbar.getBoundingClientRect();  
		setStep((evt.clientY-rect.top-10)/rect.height); 
	});
	
	return{
		update:update
	}
}  