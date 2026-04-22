import torch
import esm

def get_attention_matrix(sequence):
    """
    Loads the ESM2 model and extracts the self-attention weights 
    for a given protein sequence.
    """
    # 1. Load the pre-trained ESM2 model (33-layer version)
    # This model is a 'Transformer,' which is why it has attention maps
    model, alphabet = esm.pretrained.esm2_t33_650M_UR50D()
    batch_converter = alphabet.get_batch_converter()
    model.eval() # Set to evaluation mode for inference

    # 2. Convert your protein string (e.g., "ACDEF") into model tokens
    data = [("protein_1", sequence)]
    batch_labels, batch_strs, batch_tokens = batch_converter(data)

    # 3. Run the model and tell it to return the 'attentions'
    with torch.no_grad():
        results = model(batch_tokens, return_contacts=True)
        # We target the last layer [-1] because it contains the most 
        # refined structural information
        attentions = results["attentions"] 
        
    # 4. Process the output
    # Attention is returned as (Batch, Layers, Heads, Seq_Len, Seq_Len)
    # We take the first batch [0], last layer [-1], and average across all heads
    last_layer_attn = attentions[0][-1]
    avg_attention = last_layer_attn.mean(dim=0)
    
    # Convert the PyTorch tensor to a standard Python list for React to read
    return avg_attention.tolist()

if __name__ == "__main__":
    test_seq = "MAGRS"
    matrix = get_attention_matrix(test_seq)
    print(f"Matrix size: {len(matrix)}x{len(matrix[0])}")
    print("Top-left corner of attention matrix:", matrix[0][0])