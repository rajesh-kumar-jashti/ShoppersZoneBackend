const port = 4000;
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path'); 
const cors = require('cors');
const Razorpay = require("razorpay");
const crypto = require("crypto");
require("dotenv").config();


app.use(express.json())
app.use(cors());
app.use(express.urlencoded({ extended: false }));


mongoose.connect('mongodb+srv://rajeshkumar:rajeshkumar123@cluster0.0ebqbcg.mongodb.net/e-commerce')


app.get('/',(req,res)=>{
    res.send("Express App is Running")
})

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage: storage})

app.use('/images', express.static('upload/images'))
app.post('/upload', upload.single('product'),(req,res)=>{
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})

const Product = mongoose.model("Product",{
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true,
    },
})

app.post('/addproduct', async(req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0){
        let last = products.slice(-1);
        let last_prod = last[0];
        id = last_prod.id+1
    }
    else{
        id = 1
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        type: req.body.type,
        new_price: req.body.new_price,
        old_price: req.body.old_price
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success: true,
        name: req.body.name,
    })
})

app.post('/removeproduct', async (req,res)=>{
    await Product.findOneAndDelete({id: req.body.id});
    console.log("Removed");
    res.json({
        success: true,
        name: req.body.name
    })
})

app.get("/allproducts", async (req,res)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})

app.get('/newcollections',async(req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection);
})

app.get('/popularinmen',async(req,res)=>{
    let products = await Product.find({category:"men"});
    let popular_in_men = products.slice(0,4);
    console.log("Popular in men Fetched");
    res.send(popular_in_men);
})

app.get('/popularinwomen',async(req,res)=>{
    let products = await Product.find({category:"women"});
    let popular_in_women = products.slice(0,4);
    console.log("Popular in women Fetched");
    res.send(popular_in_women);
})



app.get('/popularinkids',async(req,res)=>{
    let products = await Product.find({category: "kids"});
    let popular_in_kids = products.slice(0,4);
    console.log("Popular in kids Fetched");
    res.send(popular_in_kids);
})

const fecthUser = async(req,res,next)=>{
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors: "Please authenticate using valid token"})
    }
    else{
        try{
            const data = jwt.verify(token,'secret_ecom');
            req.user = data.user;
            next();
        }catch(error){
            res.status(401).send({errors: "Please authenticate using valid token"})
        }
    }
}

const fecthSeller = async(req,res,next)=>{
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors: "Please authenticate using valid token"})
    }
    else{
        try{
            const data = jwt.verify(token,'secret_ecom');
            req.seller = data.seller;
            next();
        }catch(error){
            res.status(401).send({errors: "Please authenticate using valid token"})
        }
    }
}


app.post('/addtocart',fecthUser,async (req,res)=>{
    let userData = await Users.findOne({_id: req.user.id});
    userData.cartData[req.body.itemId]+=1;
    await Users.findOneAndUpdate({_id: req.user.id},{cartData:userData.cartData});
    res.send("Added");
})

app.post('/removefromcart', fecthUser, async (req,res)=>{
    console.log("removed", req.body.itemId);
    let userData = await Users.findOne({_id: req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId]-=1;
    await Users.findOneAndUpdate({_id: req.user.id},{cartData:userData.cartData})
    res.send("removed");
})

app.post('/getcart', fecthUser, async(req,res)=>{
    console.log("GetCart");
    let userData = await Users.findOne({_id: req.user.id});
    res.json(userData.cartData);
})

app.post('/addtowishlist',fecthUser,async (req,res)=>{
    let userData = await Users.findOne({_id: req.user.id});
    userData.wishListData[req.body.itemId]+=1;
    await Users.findOneAndUpdate({_id: req.user.id},{wishListData: userData.wishListData});
    res.send("Added");
})

app.post('/removefromwishlist', fecthUser, async (req,res)=>{
    console.log("removed", req.body.itemId);
    let userData = await Users.findOne({_id: req.user.id});
    if(userData.wishListData[req.body.itemId]>0)
    userData.wishListData[req.body.itemId]-=1;
    await Users.findOneAndUpdate({_id: req.user.id},{wishListData: userData.wishListData})
    res.send("removed");
})


app.post('/getwishlist', fecthUser, async(req,res)=>{
    console.log("GetCart");
    let userData = await Users.findOne({_id: req.user.id});
    res.json(userData.wishListData)
})


const Users = mongoose.model('Users',{
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    cartData: {
        type: Object,
    },
    wishListData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    }
}) 

const Sellers = mongoose.model('Sellers',{
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    productData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    }
}) 

const Orders = mongoose.model('orders',{
    username: {
        type: String,
    },
    phoneNumber: {
        type: String,
    },
    address: {
        type: String,
    },
    paymentMethod: {
        type: String,
    },
    productData: {
        type: Object
    },
    date: {
        type: Date,
        default: Date.now,
    }
}) 

app.get('/totalorders',async(req,res)=>{
    let orders = await Orders.find({});
    console.log("Popular in women Fetched");
    res.send(orders);
})


app.post('/orders', async (req, res) => {
    try {
      const formData = req.body;
      const formEntry = new Orders(formData);
      await formEntry.save();
      res.status(200).send('Form data saved successfully');
    } catch (error) {
      console.error('Error saving form data:', error);
      res.status(500).send('Internal server error');
    }
  });
  

app.post('/signup',async (req,res)=>{
    let check = await Users.findOne({email: req.body.email});
    if(check){
        return res.status(400).json({success: false, errors: "Existing user found with same email"});
    }
    let cart = {};
    for(let i=0;i<300;i++){
        cart[i]=0;
    }
    let wishlist = {};
    for(let i=0;i<300;i++){
        wishlist[i]=0;
    }
    const user = new Users({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
        wishListData: wishlist 
    })

    await user.save();

    const data = {
        user: {
            id: user.id
        }
    }
    const token = jwt.sign(data,'secret_ecom');
    res.json({success:true, token})
})


app.post('/seller-signup',async (req,res)=>{
    let check = await Sellers.findOne({email: req.body.email});
    if(check){
        return res.status(400).json({success: false, errors: "Existing user found with same email"});
    }
    const seller = new Sellers({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
    })

    await seller.save();

    const data = {
        seller: {
            id: seller.id
        }
    }
    const token = jwt.sign(data,'secret_ecom');
    res.json({success:true, token})
})

app.post('/login',async (req,res)=>{
    let user = await Users.findOne({email: req.body.email});
    if(user){
        const passCmp = req.body.password === user.password;
        if(passCmp){
            const data = {
                user:{
                    id: user.id
                }
            }

            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true, token});
        }
        else{
            res.json({success:false, errors: "Wrong Password"});
        }
    }
    else{
        res.json({success:false,errors: "Wrong Email ID"})
    }
})

app.post('/update-password', async (req, res) => {
    try {
      const email = req.body.email;
      const newPassword = req.body.newPassword;
  
      const user = await Users.findOne({ email });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      user.password = newPassword;
      await user.save();
  
      return res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error updating password:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

app.post('/seller-login',async (req,res)=>{
    let seller = await Sellers.findOne({email: req.body.email});
    if(seller){
        const passCmp = req.body.password === seller.password;
        if(passCmp){
            const data = {
                seller:{
                    id: seller.id
                }
            }

            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true, token});
        }
        else{
            res.json({success:false, errors: "Wrong Password"});
        }
    }
    else{
        res.json({success:false,errors: "Wrong Email ID"})
    }
})

// Payment

app.post("/order", async (req, res) => {
    try {
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_SECRET,
        });

        const options = req.body;
        const order = await razorpay.orders.create(options);

        if (!order) {
            return res.status(500).send("Error");
        }

        res.json(order);
    } catch (err) {
        console.log(err);
        res.status(500).send("Error");
    }
});

app.post("/order/validate", async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

    const sha = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
    //order_id + "|" + razorpay_payment_id
    sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = sha.digest("hex");
    if (digest === razorpay_signature) {
        return res.status(400).json({ msg: "Transaction is not legit!" });
    }

    res.json({
        msg: "success",
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
    });
});


app.listen(port, (error)=>{
    if(!error){
        console.log("Server Running on Port "+port);
    }
    else{
        console.log("Error: "+error);
    }
})