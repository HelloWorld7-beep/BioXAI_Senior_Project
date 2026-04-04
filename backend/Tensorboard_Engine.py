#-------Imports + model load-------#

import torch
import esm
from torch.utils.tensorboard import SummaryWriter
import os
import shutil

#Load small ESM model
model, alphabet = esm.pretrained.esm2_t6_8M_UR50D()

batch_converter = alphabet.get_batch_converter()

device = "cuda" if torch.cuda.is_available() else "cpu"
model = model.to(device)
model.eval()

print("Device:", device)


#-------Get sequences from FASTA-------#

def get_sequences(filename):
    #Get (header, sequence) pairs...need the headers for labeling later
    sequences = []

    with open(filename, 'r') as file:
        header = None
        seq = []

        for line in file:
            line = line.strip()

            if line.startswith(">"):
                if header:
                    sequences.append((header, "".join(seq)))
                header = line
                seq = []
            else:
                seq.append(line)

        if header:
            sequences.append((header, "".join(seq)))

    return sequences


#Upload the FASTA manually
sequences = get_sequences("sampled_uniref_50_300.fasta")
print("Num sequences:", len(sequences))


#-------Get embedding-------#

def get_embedding(sequence):

    #Model expects label sequence format
    data = [("protein", sequence)]

    _, _, tokens = batch_converter(data)
    tokens = tokens.to(device)

    #Inference
    with torch.no_grad():
        outputs = model(tokens, repr_layers=[6])

    #Get token level embeddings
    token_embeddings = outputs["representations"][6]
    token_embeddings = token_embeddings.squeeze(0)

    #Average across sequence single vector
    embedding = token_embeddings.mean(dim=0)

    return embedding.cpu()


#-------Compute ALL embeddings background cloud-------#

embeddings = []

metadata = []
categories = []

for header, seq in sequences:
    emb = get_embedding(seq)

    embeddings.append(emb)

    metadata.append(header)
    categories.append("DATA") #So that I can clearly color path later

X = torch.stack(embeddings)

#print("Embedding shape:", X.shape)


#-------Pick ONE protein to highlight-------#

target_header, target_seq = sequences[1]
#print(target_header)


#-------Generate interpolation path IG style, but just the path not gradients. For now...-------#

def get_interpolation_path(sequence, steps=100, label_prefix=None):

    #Convert sequence to tokens
    data = [("protein", sequence)]
    _, _, tokens = batch_converter(data)
    tokens = tokens.to(device)

    #Get embedding layer output directly continuous space
    with torch.no_grad():
        embeddings = model.embed_tokens(tokens)

    #Baseline average protein embedding better than zero vector
    baseline_vec = X.mean(dim=0).to(device)
    baseline = baseline_vec.unsqueeze(0).unsqueeze(0).expand_as(embeddings)

    path = []
    path_metadata = []
    path_categories = []

    for i in range(steps + 1):
        alpha = i / steps

        #xStandard IG interpolation
        interpolated = baseline + alpha * (embeddings - baseline)

        #Mean pool so we get same shape as normal embeddings
        pooled = interpolated.squeeze(0).mean(dim=0).cpu()

        path.append(pooled)

        if label_prefix:
            path_metadata.append(f"{label_prefix}_step_{i}")
            path_categories.append("PATH")

    return torch.stack(path), path_metadata, path_categories

#-------Compute gradient norms along path-------#

def compute_gradient_norms(sequence, steps=100):

    data = [("protein", sequence)]
    _, _, tokens = batch_converter(data)
    tokens = tokens.to(device)

    with torch.no_grad():
        embeddings = model.embed_tokens(tokens)

    baseline_vec = X.mean(dim=0).to(device)
    baseline = baseline_vec.unsqueeze(0).unsqueeze(0).expand_as(embeddings)

    grad_norms = []

    for i in range(steps + 1):
        alpha = i / steps

        interpolated = baseline + alpha * (embeddings - baseline)
        interpolated.requires_grad_(True)

        #simple scalar output (use sum of embeddings as proxy)
        pooled = interpolated.mean()
        
        pooled.backward()

        grad = interpolated.grad

        grad_norm = grad.norm().item()
        grad_norms.append(grad_norm)

    return grad_norms


#Generate the path
path, path_metadata, path_categories = get_interpolation_path(
    target_seq,
    steps=100,
    label_prefix=target_header
)
#print("Path shape:", path.shape)


#-------Combine background plus trajectory-------#

X_combined = torch.cat([X, path], dim=0)

metadata_combined = metadata + path_metadata
categories_combined = categories + path_categories

#print(f"Combined shape: {X_combined.shape}")


#-------Log embeddings to TensorBoard-------#

#Clear old runs (replace Colab !rm -rf)
if os.path.exists("runs"):
    shutil.rmtree("runs")

metadata_tb = [[cat, label] for cat, label in zip(categories_combined, metadata_combined)]

writer = SummaryWriter("runs/trajectory_with_background")


writer.add_embedding(
    X_combined,
    metadata=metadata_tb,
    metadata_header=["Type", "Label"]

writer.close()
print("Done logging!")


#-------Launch TensorBoard (run manually in terminal)-------#

#python -m Tensorboard_Engine.py --logdir=runs