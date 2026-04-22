emailjs.init("XEoYfspdCBFJ-5BTq")

document.getElementById("orderForm").addEventListener("submit",function(e){
e.preventDefault()

const params={
name:document.getElementById("name").value,
phone:document.getElementById("phone").value,
order:document.getElementById("orderText").value,
delivery:document.getElementById("delivery").value,
notes:document.getElementById("notes").value
}

emailjs.send("service_bzxfy6e","template_ros2mco",params)
.then(()=>{
alert("Order request sent. Seller will contact you.")
this.reset()
})
.catch(()=>{
alert("Failed to send order.")
})
})
