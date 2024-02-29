var toastElList = [].slice.call(document.querySelectorAll('.toast'))
var toastList = toastElList.map(function(toastEl) {
    return new bootstrap.Toast(toastEl, {
        delay: 2000
    })
})

function copy(element) {
    let $temp
    if (element == 'bank') {
        $temp = $('<input>')
        $('body').append($temp)
        $temp.val($('#bankNo').html()).select()
    } else {
        $temp = $('<input>')
        $('body').append($temp)
        $temp.val($('#walletNo').html()).select()
    }

    document.execCommand('copy')
    $temp.remove()
    toastList[0].show()
}




$(document).ready(() => {
    let x = promptpayQr('1320700153069', {
        amount: 0
    })
    $('#promptpay-qr-img').attr('src', 'https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=' + x + '&choe=UTF-8')
    $('#promptpay-qr-img2').attr('src', 'https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=' + x + '&choe=UTF-8')
    $('#amount').on('input', () => {
        if ($('#amount').val() == '') {
            $('#amount').val(0)
        }

        let x = promptpayQr('1320700153069', {
            amount: Number($('#amount').val())
        })
        $('#promptpay-qr-img').attr('src', 'https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=' + x + '&choe=UTF-8')
        $('#promptpay-qr-img2').attr('src', 'https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=' + x + '&choe=UTF-8')
    })

    $('#save-img').on('click', () => {
        // download image, do no open new tab
        let canvas = document.createElement('canvas')
        canvas.width = 300
        canvas.height = 300
        let ctx = canvas.getContext('2d')
        ctx.drawImage(document.getElementById('promptpay-qr-img'), 0, 0)
            // ctx.drawImage(document.getElementById('promptpay-qr-img2'), 0, 0)
        let dataurl = canvas.toDataURL('image/png')
        var a = document.createElement('a')
        a.href = dataurl
        a.download = 'promptpay-qr.png'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    })

    $('#save-img2').on('click', () => {
        // download image, do no open new tab
        let canvas = document.createElement('canvas')
        canvas.width = 300
        canvas.height = 300
        let ctx = canvas.getContext('2d')
            // ctx.drawImage(document.getElementById('promptpay-qr-img'), 0, 0)
        ctx.drawImage(document.getElementById('promptpay-qr-img2'), 0, 0)
        let dataurl = canvas.toDataURL('image/png')
        var a = document.createElement('a')
        a.href = dataurl
        a.download = 'promptpay-qr.png'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    })

})
var promptpayQr;