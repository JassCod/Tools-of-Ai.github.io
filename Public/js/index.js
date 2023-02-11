fetch("./Articles/api.json").then((data)=>{
    return data.json();
}).then((completedata)=>{
    // console.log(completedata[0].title);
    let data = "";
    completedata.map((value) => {
        data += `
         <div class="cards" style="width: 18rem;">
             <img src="${value.image}"class="card-img-top" alt="...">
            <div class="card-body">
                <h5 class="card-title">${value.title}</h5>
                <p class="card-text">${value.description}</p>
                <div class="buttons">
                     <a href="${value.link}" class="btn btn-primary">learn More</a>
                    <a href="${value.links}" class="btn btn-primary" target="_blank"><i class="fa-sharp fa-solid fa-share-from-square"></i></a>
                </div>
             </div>
         </div>`
    });
    document.querySelector(".card-of-cards").innerHTML = data;
    // console.log(`${value.title}`)

}).catch((err)=>{
    console.log(err)
})