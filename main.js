const view_canvas = document.getElementById('view_canvas')
const draw = view_canvas.getContext("2d");
view_canvas.addEventListener("mousedown", function (me) { mDown(me) }, false);
view_canvas.addEventListener("mousemove", function (me) { mMove(me) }, false);
view_canvas.addEventListener("mouseup", function (me) { mUp(me) }, false);
view_canvas.addEventListener("mouseout", function (me) { mOut(me) }, false);

draw.lineWidth = 3; // 컨버스에 그리는 라인의 두께 설정
draw.strokeStyle = "#006cb7"
var drag = false;
let img;
let rect = [0,0,0,0]


function ocr_progress_set(d){
    const ocr_progress = document.getElementById('ocr_progress')
    ocr_progress.innerHTML = parseFloat(d).toFixed(2)+'%'
        ocr_progress.value = d;
}

function r(){return view_canvas.width/view_canvas.clientWidth}


function mMove(me) {
    if (!drag)  return; //drag가 false 일때는 return(return 아래는 실행 안함)
    var [nowX, nowY] = [me.offsetX*r(), me.offsetY*r()]; //마우스를 움직일 때마다
    canvasDraw(nowX, nowY);
    [stX, stY] = [nowX, nowY]
}

function mDown(me) {
    [rect[0], rect[1]] = [startX, startY] = [me.offsetX*r(), me.offsetY*r()];
    [stX, stY] = [me.offsetX*r(), me.offsetY*r()]; //눌렀을 때 현재 마우스 X좌표를 stX에 담음
    drag = true; //그림 그리기는 그리는 상태로 변경
}

function mUp(me) {
    [endX, endY] = [me.offsetX*r(), me.offsetY*r()]
    drag = false; //마우스를 떼었을 때 그리기 중지
    document.getElementById('ocr_btn').click()
}
function mOut(me) { if(drag) document.getElementById('ocr_btn').click(); drag = false; } //마우스가 캔버스 밖으로 벗어났을 때 그리기 중지


function canvasDraw(currentX, currentY) {
    [rect[2], rect[3]]=[currentX, currentY]
    draw.clearRect(0, 0, draw.canvas.width, draw.canvas.height) //설정된 영역만큼 캔버스에서 지움
    if(img) draw.drawImage(img, 0, 0);
    draw.strokeRect(startX, startY, currentX - startX, currentY - startY) //시작점과 끝점의 좌표 정보로 사각형을 그려준다.
}



fetch('./list').then(v => v.json()).then(d => {
    console.log(d);
    var dt = d.map(v => {
        return `<div onclick="show(unescape('${escape(v)}'))">${v}</div>`
    }).join('')
    document.getElementById('wrap').innerHTML = dt;

});

function reset_ocred(){
    document.getElementById('res').innerHTML = ''
    document.getElementById('res_txt').innerHTML = ''
    document.getElementById('res_txt2').innerHTML = ''
}

function show(url) {
    console.log('[hocr]', url)
    reset_ocred()
    //const view_img = document.getElementById('view_img')
    //const view_canvas = document.getElementById('view_canvas')
    //const draw = view_canvas.getContext("2d");
    const { width, height } = { width: view_canvas.width, height: view_canvas.height };
    draw.clearRect(0, 0, view_canvas.width, view_canvas.height);


    img = new Image();
    img.src = './img/' + url;
    img.onload = () => {
        console.log(img.width, img.height)
        rect = [0,0,img.width,img.height]
        if(screen.width<img.width) view_canvas.style.width='100%'
        else view_canvas.style.width=''

        if(view_canvas.width < img.width) view_canvas.width = img.width
        if(view_canvas.height < img.height) view_canvas.height = img.height

        draw.drawImage(img, 0, 0);
    }
    document.getElementById('ocr_btn').onclick = () => {
        hocr(url);
    }
}
//let key = null;
//let interver = null;

function hocr(url) {
    reset_ocred()
    fetch('./hocr/send', {
        method:'POST',
        body: JSON.stringify({rect,url,lang:lan_select.value})
    }).then(data=>{
        if(data.status==200) return data.text()
        else return undefined;
    }).then(d=>{
        if(!d) return;
        const key = d;
        const interver = setInterval(() => {
            fetch('./hocr/state',{
                method:'POST',
                    body: key
            }).then(d=>d.json()).then(d=>{
                d = Number(d)
                //console.log('현재상태, d',d)
                ocr_progress_set(d);
                if(d>1){
                    ocr_progress_set(0);
                    clearInterval(interver);
                    setTimeout(()=>{
                        get_hockr_data(key)
                    },200)
                }
            })
        }, 500);
    })
}
    
function get_hockr_data(key){
    fetch('./hocr/datas', {
        method:'POST',
        body: key
    }).then(data => data.json()).then(v => {
        console.log(v);
        document.getElementById('res').innerHTML = v.hocr;
        document.getElementById('res_txt').innerText = v.text;

        document.querySelectorAll('#res span.ocrx_word').forEach(v => {
            let list = v.title.split(' ').filter(v => !isNaN(v)).map(v => Number(v)).splice(0, 4)
            console.log(list)
            draw.strokeStyle = "#" + Math.round(Math.random() * 0xffffff).toString(16);
            draw.strokeRect(list[0], list[1], list[2]-list[0], list[3]);

        })

        document.getElementById('res_txt2').innerText = h2v(v.text);


    })
}

function h2v(txt) {
    b = txt.split('\n').map(v => v.split(' '))

    c = new Array(Math.max(...b.map(v => v.length))).fill('');
    b.forEach(v => {
        v.forEach((vv, j) => {
            c[j] += vv;
        })
    })
    return c.reverse().join('\n')
}
