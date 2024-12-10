const serverDomain = "http://127.0.0.1:3000";
import {createApp} from "vue"


const app = createApp({

    data(){
      return{
        ecpayHtml:"",
        serverDomain: serverDomain,
        buyItems: {},//購物車 
        products:[]
      }
    },
    async mounted(){//最先執行
      this.products = await fetch(`${serverDomain}/products/list`).then((res)=>
        {return res.json();}
      );

      paypal.Buttons({
        createOrder:async (data,actions) => {
            //串接server code
            
            const items = this.getItemDetailByBuyItems();
            const result = await this.sendPayment(`${this.serverDomain}/orders/create`,
              {
              paymentProvider:"PAYPAL",
              paymentWay:"PAYPAL",
              contents: items,
            });
            console.log("file index.ts paypal result",result);
            return result.data ;
            
        },
        onApprove:(data,actions)=>{
          console.log("file index.js paypal button data",data);
          return actions.order.capture();
        }
      }).render('#paypal-area');

      
    },
    methods:{
      getItemDetailByBuyItems(){
        return Object.entries(this.buyItems).map(([id,amount])=> ({
          productId:Number(id),
          price:this.products.find((product) => product.id === Number(id)).price,
          amount:Number(amount),
        }));//[{ productId:1, price:100, amount:9},{ productId:2, price:100, amount:15}]把訂單轉換成陣列
      },
      async sendPayment(url,data){
        try{
          const results = await fetch(url,{
            method:"POST",
            headers:{
              "Content-Type":"application/json"
            },
            cors:"no-cors",
            body:JSON.stringify(data),
          }).then((res)=>{
            
            if(res.ok) return res.json();
            return res.json().then((json) => Promise.reject(json));
            
          })
          
          return results
        }catch(e){
          console.error("index.js error 31, sendPayment", e);
          throw new Error(e);
        }
      },
      async ECPay(){
        if(!Object.keys(this.buyItems).length) return alert("沒有選項");
  
        const items = this.getItemDetailByBuyItems();
        console.log("index.ts line55 ECPay getItemDetailByBuyItems", items);
  
        const result = await this.sendPayment(`${this.serverDomain}/orders/create`,
          {
          paymentProvider:"ECPAY",
          paymentWay:"CVS",
          contents: items,
        });

        const { data:html} = result;
        this.ecpayHtml = html;
        this.$nextTick(() => {
          document.getElementById("_form_aiochk").submit() 
        });
        console.log(this.ecpayHtml);
      }
    },
   
})


//console.log('before mounting the app');
app.mount('#app');
//console.log('after mounting the app');
/*
var vue = new Vue({
  el: "#app",
  data() {
      return {
          products:[]
      };
  },
  async mounted(){
      this.products = await fetch(`${serverDomain}/products/list`).then((res)=>
          res.json()
      );
      console.log("file:index.js line14~mounted~this.product ",this.products);
  }
      
});


*/