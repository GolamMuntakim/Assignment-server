const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000
const app = express()
const corsOption = {
    origin:['http://localhost:5173', 'http://localhost:5174','https://b9-a11-37619.web.app','https://b9-a11-37619.firebaseapp.com'],
    credentials : true,
    optionSuccessStatus:200,
}
app.use(cors(corsOption))
app.use(express.json())
app.use(cookieParser())

//middleware
const verifyToken = (req,res,next)=>{
  const token = req.cookies?.token
  if(!token) return res.status(401).send({message:'unauthorized access'})
      if(token){
        jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
          if(err){
            return res.status(401).send({message:'unauthorized access'})
            // return
          }
          console.log(decoded)
          req.user = decoded
          next()
        })
      }
     
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ajfjwu7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const cookieOption =  {
  httpOnly:true,
  secure:process.env.NODE_ENV ==='production' ? true : false,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
}

async function run() {
  try {
    const assignmentsCollection = client.db('b9-a11').collection('assignments')
    const submittedCollection = client.db('b9-a11').collection('submittedAssignments')
    // const marksCollection = client.db('b9-a11').collection('marks')

    //jwt generate
    app.post('/jwt', async(req,res)=>{
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
        expiresIn: '365d',
      })
      res.cookie('token' ,token,cookieOption).send({success : true})
    })

    //clear cookie on logout
    app.get('/logout',(req,res)=>{
      res.clearCookie('token' ,{...cookieOption, maxAge:0 }).send({success : true})
    })

     // get all assignments  data from db
     app.get('/assignments', async(req,res)=>{
        const result = await assignmentsCollection.find().toArray()
        res.send(result)
     })
     //get a single assignments data form db
     app.get('/viewassignmengts/:id', async(req,res)=>{
      const id= req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await assignmentsCollection.findOne(query)
      res.send(result)
     })
     //save submitted data in database
     app.post('/submit', async(req,res)=>{
      const submittedData = req.body
      const query = {
        email : submittedData.email,
        assignmentId: submittedData.assignmentId
      }
      const alreadysubmittedAssignments = await submittedCollection.findOne(query)
      if(alreadysubmittedAssignments){
        return res 
                .status(400)
                .send('You have already submitted assignment ')
      }
      const result = await submittedCollection.insertOne(submittedData)
      res.send(result)

     })
     //save assignments in database 
     app.post('/assignment', async(req,res)=>{
      const data = req.body
      const result = await assignmentsCollection.insertOne(data)
      res.send(result)
     })
     //delete assignments database 
    app.delete('/deleteassignment/:id', async(req, res)=>{
      const id = req.params.id
      const query = {_id:new ObjectId(id)}
      // const query = {'maker.email' : email}
      const result = await assignmentsCollection.deleteOne(query)
      res.send(result)
    })
     
     //update assignment data 
     app.put('/updateassignment/:id',async(req,res)=>{
      const id = req.params.id
      const assignmentData = req.body
      const query = {_id:new ObjectId(id)}
      const options = {upsert :true}
      const updateDoc = {
        $set:{
          ...assignmentData,
        },
      }
      const result = await assignmentsCollection.updateOne(query,updateDoc,options)
      res.send(result)
     })

     //Get all submitted assignments
     app.get('/submit/:email',verifyToken, async(req,res)=>{
      const tokenEmail = req.user.email
      const useremail = req.params.email
      if(tokenEmail !== useremail){
        return res.status(403).send({message:'forbidden access'})
      }
      const query = {email : useremail}
      const result = await submittedCollection.find(query).toArray()
      res.send(result)
     })


     //get assignments in pending assignments 
     app.get('/pendingassignments',async(req,res)=>{
      // const email = req.params.email
      // const query = {'maker.email':email}
      const result = await submittedCollection.find().toArray()
      res.send(result)
     })
    //  save marks in marks  
  
    app.post('/mysubmittedassignments/:id', async (req, res) => {
      const id = req.params.id; 
      const newData = req.body; 
      try {
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            ...newData,
            obtainednumber: newData.obtainednumber,
            feedback: newData.feedback,
            status : 'completed'
          }
        };
        const result = await submittedCollection.updateOne(query, updateDoc);
        console.log(result);
        if (result.modifiedCount === 1) {
          res.status(200).json({ message: "Data updated successfully" });
        } else {
          res.status(404).json({ message: "Data not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    });

     // get all assignments  data from db for pagination
     app.get('/all-assignments', async(req,res)=>{
      const size = parseInt(req.query.size)
      const page = parseInt(req.query.page) -1
      const filter = req.query.filter
      console.log(size, page)
      let query = {}
      if(filter) query = {difficulty_level : filter}
      const result = await assignmentsCollection.find(query).skip(page*size).limit(size).toArray()
      res.send(result)
   })
     // get all assignments  count from db 
     app.get('/assignments-count', async(req,res)=>{
      const filter = req.query.filter
      let query = {}
      if(filter) query = {difficulty_level:filter}
      const count = await assignmentsCollection.countDocuments(query)
      res.send({count})
   })
    

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('hello')
})
app.listen(port,()=>console.log(`server running on port ${port}`))