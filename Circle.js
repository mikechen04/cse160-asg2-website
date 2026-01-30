class Circle {
    constructor() {
        this.type = 'circle';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 5.0;
        this.segments = 20;
    }

    render() {
        var xy = this.position;
        var rgba = this.color;
        
        // Pass the color of the circle to u_FragColor variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        
        // Generate vertices for a circle using triangle fan
        // Triangle fan: center point first, then points around the circle
        var d = this.size / 200.0; // Radius in WebGL coordinates (scaled appropriately)
        let vertices = [];
        
        // Add center point first (required for triangle fan)
        vertices.push(xy[0], xy[1]);
        
        // Add points around the circle using the stored segments value
        let segments = this.segments;
        for (var i = 0; i <= segments; i++) {
            var angle = (i * 360 / segments) * Math.PI / 180;
            var x = xy[0] + d * Math.cos(angle);
            var y = xy[1] + d * Math.sin(angle);
            vertices.push(x, y);
        }
        
        // Draw circle using triangle fan
        drawCircle(vertices);
    }
}

function drawCircle(vertices) {
    var n = vertices.length / 2; // Number of vertices (center + perimeter points)
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      console.log('Failed to create the buffer object');
      return -1;
    }
  
    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write data into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);
  
    // Draw the circle as a triangle fan
    // Triangle fan uses the first vertex as center, then draws triangles between adjacent vertices
    gl.drawArrays(gl.TRIANGLE_FAN, 0, n);
    
    // Disable vertex attrib array after drawing to avoid conflicts with other rendering
    gl.disableVertexAttribArray(a_Position);
    
    return n;
}
