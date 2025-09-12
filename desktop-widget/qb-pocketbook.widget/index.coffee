refreshFrequency: false

# Position and size the widget on the desktop
style: """
  left: 24px
  top: 24px
  width: 1100px
  height: 700px
  background: rgba(0,0,0,0)
  border: 0
"""

render: -> """
  <div id="wrap" style="width:100%;height:100%;">
    <iframe src="site/index.html" style="width:100%;height:100%;border:0;background:transparent" allowtransparency="true"></iframe>
  </div>
"""

