const express = require('express')
const cors = require('cors')
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

// const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ajfjwu7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const assignmentsCollection = client.db('b9-a11').collection('assignments')
    const submittedCollection = client.db('b9-a11').collection('submittedAssignments')
    const marksCollection = client.db('b9-a11').collection('marks')
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
     app.delete('/deleteassignment/:email', async(req,res)=>{
      const email = req.params.email
      const query = {'maker.email' : email}
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
     app.get('/submit/:email', async(req,res)=>{
      const useremail = req.params.email
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
    // app.put('/mysubmittedassignments/:id', async(req,res)=>{
    //   const id = req.body
    //   const result = await marksCollection.insertOne(id)
    //   console.log(result)
    //   res.send(result)
    //  })
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