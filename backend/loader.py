from flask import Flask, jsonify

# Load web page
from langchain.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

#Embed and store
from langchain.vectorstores import Chroma
from langchain.embeddings import GPT4AllEmbeddings
#from langchain.embeddings import OllamaEmbeddings

from langchain.llms import Ollama
from langchain.callbacks.manager import CallbackManager
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler

app = Flask(__name__)

# GET /hello endpoint
@app.route('/hello')
def hello():
    response = getReleaseNotes();
    return jsonify(message=response)


def getReleaseNotes():        
    url = "https://raw.githubusercontent.com/angular/angular/main/CHANGELOG.md"
    print (f"using URL: {url}")

    loader = WebBaseLoader(url)
    data = loader.load()

    # Split into chunks
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=10)
    all_splits = text_splitter.split_documents(data)
    print(f"Split into {len(all_splits)} chunks")

    vectorstore = Chroma.from_documents(documents=all_splits,                                        
                                        embedding=GPT4AllEmbeddings())
    
    # Retrieve
    query = "This feature or bug was updated to add or remove the following."
    docs = vectorstore.similarity_search(query)

    print(f"Loaded {len(data)} documents")

    # RAG prompt
    from langchain import hub
    QA_CHAIN_PROMPT = hub.pull("rlm/rag-prompt-llama")

    # LLM
    llm = Ollama(base_url="http://host.docker.internal:11434",
                model="llama2",
                callback_manager= CallbackManager([StreamingStdOutCallbackHandler()]))
    
    print(f"Loaded LLM model {llm.model}")

    #QA chain

    from langchain.chains import RetrievalQA
    qa_chain = RetrievalQA.from_chain_type(
        llm, retriever=vectorstore.as_retriever(),
        chain_type_kwargs={"prompt": QA_CHAIN_PROMPT},
    )

    question = "Create release notes from these commits? Skip the commit ids and urls, I just care about the features and bug fixes."
    response = qa_chain({"query": question}) 

    print(response) #response contains query and result
    return response['result'];

if __name__ == '__main__':
    app.run()
