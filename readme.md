# raw2JPG converter

RAW image preview extractor (.NEF, .ARW, CR2)

This project was inspired by UTIF.js
https://github.com/photopea/UTIF.js


usage example
```html
<script src="raw2JPG.js"></script>

<input type="file" id="fileselect">
<img style="display: none;" src="#" id="image" />
```

In Javascript

```javascript
let filesElement = document.getElementById("fileselect")

filesElement.addEventListener("change", function () {
    var fr = new FileReader();
    fr.onload = function () {
        var data = fr.result;
        var array = new Int8Array(data);
        var blob = new Blob([raw2JPG.convert(array)], { type: "image/jpeg" });
        let imageDomElement = document.getElementById("image")

        imageDomElement.src = window.URL.createObjectURL(blob)
        imageDomElement.style = ""
    };
    fr.readAsArrayBuffer(filesElement.files[0]);
})
```