	var Panel = sd.widget.Panel;
    var Tag = sd.widget.Tag;
    var BorderLayout = sd.layout.BorderLayout;
	var Window = sd.widget.Window;
	var Desktop = sd.widget.Desktop; 

    var win = new Window(true);
    win.setSize(400, 300);
    win.title('hellowWorld');
    var video = '<video controls><source src="http://www.w3schools.com/html/movie.mp4" type="video/mp4"></video>';
    win.body.html(video);
    
	


    var win2 = new Window(true);
    win2.title('another one!');
    win2.setSize(200, 300);
    win2.setLocation(420, 100);
    win2.body.html('hedddllo');
    win2.body.html('hedddllo');

    var desktop = new Desktop(); 

    desktop.add(win); 
    desktop.add(win2);

    var menu = new sd.widget.Menu();
    menu.addMenuItem('File', ['new', 'open', 'open remote', 'save']);
    menu.addMenuItem('Edit', ['Edit1', 'Edit2', 'Edit3']);
    menu.addMenuItem('Edit', ['More!', 'MoreMore']); 
    desktop.north.add(menu);

    var toolbar = new Panel(false).addClass('ToolBar');
    var tools = new sd.widget.ToolPanel();
    tools.addButton('new');
    tools.addButton('open');
    tools.addButton('remote');
    tools.addButton('save');

    toolbar.add(tools);

    desktop.north.add(toolbar);

    var sidePanel = new sd.widget.SidePanel();
    desktop.west.add(sidePanel, 1); 
    
	var toolboxTree = new sd.widget.Tree();
	toolboxTree.addItem('root','root');
	toolboxTree.addItem('node1','node1','root');
	toolboxTree.addItem('node3','node3','node1');
	toolboxTree.addItem('node4','node4','node1');
	toolboxTree.addItem('node2','node2','root'); 
	
	toolboxTree.getMenu = function(id){
		if (id=='node1'){
			return ['test1','test2'];
		}
	};
    
	var panel = new sd.widget.Panel();
	var tools = new sd.widget.ToolPanel();
	tools.addButton('new',24);
	panel.add(tools);
	panel.add(toolboxTree,1);
	sidePanel.addPanel('toolbox', panel);
	sidePanel.addPanel('library', new Panel().html('open panel'));
	sidePanel.addPanel('remote', new Panel().html('new panel'));
	
    
    var html = 'A wiki is usually a web application which allows people to add, modify, or delete content in a collaboration with others. Text is usually written using a simplified ...';
    sidePanel.addPanel('history', pl = new Panel().html(html), true);
    pl.css('overflow','auto'); 
	sidePanel.addPanel('info', new Panel().html('open panel'),true);

    var sidePanel2 = new sd.widget.SidePanel(true);
    desktop.east.add(sidePanel2, 1);
    sidePanel2.addPanel('sentences', new Panel().html('open panel'));
    sidePanel2.addPanel('words', new Panel().html('save panel')); 
	sidePanel2.addPanel('comments', new Panel().html('save panel')); 
	
	sidePanel2.addPanel('dictionary', new Panel().html('save panel'),true); 
	 
    
	
	var tabs = new sd.widget.TabPanel(); 
	
	var max = false;  
    //tabs.css('webkitTransition','left 1s, top 1s, width 1s, height 1s');
	tabs.onDbTap = function(){
		desktop.east.setVisibility(max);
		desktop.west.setVisibility(max);
		desktop.south.setVisibility(max);
		desktop.doLayout();
		max = !max; 
	}
	
	desktop.center.add(tabs,1); 
	
	tabs.addTab('tab1', p = new Panel().html('open panel'));
    p.element.id = 'editor1';
	tabs.addTab('tab2', p = new sd.widget.Html('<textarea id="editor2" style="width:100%;height:100%;border:none;"></textarea>')); 
    
    tabs.addTab('tab3', new Panel().html('tabs'));   
    
    var dock = new sd.widget.WindowDock();
    desktop.south.add(dock);  
    //dock.addItem('test').set(100,100);
   // dock.addItem('test2').set(100,100);
    
	desktop.fullScreen();
     
    
     
    