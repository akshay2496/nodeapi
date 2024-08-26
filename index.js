const express = require("express");
const cors = require("cors");
require("./db/config");

const User = require("./db/User");

const Product = require("./db/Product");

const Cms = require("./db/Cms");


// Token
const Jwt = require("jsonwebtoken");
const jwtkey = "gbhnjknhbb";

// Image 
const multer = require("multer");
const path = require("path");
const fs = require("fs");


const app = express();

app.use(express.json());
app.use(cors());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get("/", (req, res) => {
  res.send("App is working...");
});


// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)); // Define the file naming convention
  }
});

const upload = multer({ storage: storage });


app.post("/register", async (req, res) => {
  let user = new User(req.body);
  let result = await user.save();
  result = result.toObject();
  delete result.password;
  // res.send(result)

  Jwt.sign({ result }, jwtkey, (err, token) => {
    if (err) {
      res.send({ result: "something went wrong" });
    }
    res.send({ result, auth: token });
  });
});

app.post("/login", async (req, res) => {
  console.warn(req.body);
  if (req.body.password && req.body.email) {
    let user = await User.findOne(req.body).select("-password");
    if (user) {
      Jwt.sign({ user }, jwtkey, (err, token) => {
        if (err) {
          res.send({ result: "something went wrong" });
        }
        res.send({ user, auth: token });
      });
    }
  } else {
    res.send({ result: "No user fond." });
  }
});

app.post("/add-product",verifyToken, upload.single('productImage'), async (req, res) => {

  const image = req.file ? req.file.path : null;

  let product = new Product({...req.body,image});
  let result = await product.save();
  res.send(result);
});

app.get("/product-list",verifyToken, async (req, res) => {
  let products = await Product.find();
  if (products.length > 0) {
    res.send(products);
  } else {
    res.send({ result: "NO products Found" });
  }
});

app.delete("/product-delete/:id",verifyToken, async (req, res) => {
  const result = await Product.deleteOne({ _id: req.params.id });
  res.send(result);
});

app.get("/product-update/:id",verifyToken, async (req, res) => {
  let result = await Product.findOne({ _id: req.params.id });
  if (result) {
    res.send(result);
  } else {
    res.send({ result: "Product not found" });
  }
});


app.put("/product-update/:id", verifyToken, upload.single('productImage'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send({ error: 'Product not found' });

    if (req.file && product.image) {
      const oldImagePath = path.join(__dirname, product.image);
      if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
    }

    const updateData = { ...req.body, image: req.file?.path || product.image };
    await Product.updateOne({ _id: req.params.id }, { $set: updateData });

    res.send({ success: true, message: 'Product updated', data: { ...product.toObject(), ...updateData } });
  } catch (error) {
    res.status(500).send({ error: 'Failed to update product' });
  }
});

app.get("/search/:key",verifyToken, async (req, res) => {
  let result = await Product.find({
    $or: [
      { name: { $regex: req.params.key } },
      { company: { $regex: req.params.key } },
      { category: { $regex: req.params.key } },
    ],
  });
  res.send(result);
});

// CMS
// Create a new policy
app.post('/cms', async (req, res) => {
  try {
    const { title, body, type } = req.body;
    const cms = new Cms({ title, body, type });
    await cms.save();
    res.status(200).json(cms);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a policy by ID
app.get('/cms/type/:type', async (req, res) => {
  try {
    const cms = await Cms.findOne({type:req.params.type});
    if (!cms) return res.status(404).json({ message: 'Policy not found' });
    res.json(cms);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a policy by type
app.put('/cms/type/:type', async (req, res) => {
  try {
    const cms = await Cms.findOneAndUpdate({type:req.params.type}, req.body, { new: true });
    if (!cms) return res.status(404).json({ message: 'Policy not found' });
    res.json(cms);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all policies
app.get('/policies', async (req, res) => {
  try {
    const policies = await Cms.find();
    res.json(policies);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

function verifyToken(req, res, next) {
  let token = req.headers["authorization"];
  if (token) {
    token = token.split(" ")[1];
    Jwt.verify(token, jwtkey, (err, valid) => {
      if (err) {
        res.status(401).send({ result: "Please provide valid token" });
      } else {
        next();
      }
    });
  } else {
    res.status(403).send({ result: "Please add token with header" });
  }
}

app.listen(5000);

console.log("Server is running on port 5000...");
