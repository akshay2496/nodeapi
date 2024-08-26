const mongoose= require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/akshay-login", {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });